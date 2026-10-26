import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createApiClient } from '@/api/client'
import { ApiService } from '@/api/endpoints'
import { clearSessionTokens, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '@/api/sessionTokens'
import { useSessionStore } from '@/stores/session'

const user = { id: 1, email: 'user@example.com', firstName: 'Test', lastName: 'User', role: 'USER' }
const auth = { accessToken: 'new-access', refreshToken: 'new-refresh', user }
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: '', headers: new AxiosHeaders() }
}
function failure(config: InternalAxiosRequestConfig, status: number, data = {}) {
  return Promise.reject(new AxiosError('Request failed', undefined, config, undefined, response(config, data, status)))
}

beforeEach(() => {
  localStorage.clear()
  clearSessionTokens()
  setActivePinia(createPinia())
})

describe('authentication API', () => {
  it('uses the backend prefix and never sends stale access tokens or refreshes on wrong login', async () => {
    setAccessToken('stale')
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.baseURL).toBe('/api/v1')
      expect(config.headers.Authorization).toBeUndefined()
      return failure(config, 401)
    })
    axios.defaults.adapter = adapter
    const unauthorized = vi.fn()
    await expect(new ApiService(createApiClient(unauthorized)).login({ email: user.email, password: 'wrong' }))
      .rejects.toMatchObject({ message: 'Неверный email или пароль.', status: 401 })
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(unauthorized).not.toHaveBeenCalled()
  })

  it('registers without stale authorization and explains duplicate email', async () => {
    setAccessToken('stale')
    axios.defaults.adapter = async (config) => {
      expect(config.url).toBe('/auth/register')
      expect(config.headers.Authorization).toBeUndefined()
      return failure(config, 409)
    }
    await expect(new ApiService(createApiClient(vi.fn())).register({ ...user, password: 'secret' }))
      .rejects.toMatchObject({ code: 'CONFLICT', message: 'Аккаунт с таким email уже существует. Войдите в него.' })
  })

  it('refreshes concurrent expired requests once and retries with the rotated token', async () => {
    setAccessToken('expired')
    setRefreshToken('old-refresh')
    let refreshes = 0
    axios.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshes++
        await new Promise((resolve) => setTimeout(resolve, 5))
        return response(config, auth)
      }
      if (config.headers.Authorization === 'Bearer expired') return failure(config, 401)
      expect(config.headers.Authorization).toBe('Bearer new-access')
      return response(config, [])
    }
    const client = createApiClient(vi.fn())
    await Promise.all([client.get('/rooms'), client.get('/bookings/me')])
    expect(refreshes).toBe(1)
    expect(getAccessToken()).toBe('new-access')
    expect(getRefreshToken()).toBe('new-refresh')
  })

  it('clears session and notifies the application when refresh is rejected', async () => {
    setAccessToken('expired')
    setRefreshToken('expired-refresh')
    axios.defaults.adapter = (config) => failure(config, 401)
    const unauthorized = vi.fn()
    await expect(createApiClient(unauthorized).get('/rooms')).rejects.toMatchObject({ status: 401 })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(unauthorized).toHaveBeenCalledOnce()
  })

  it('retains field errors returned by backend validation', async () => {
    axios.defaults.adapter = (config) => failure(config, 400, { errors: { email: 'Invalid email' } })
    await expect(createApiClient(vi.fn()).post('/auth/register', {}))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', fieldErrors: { email: 'Invalid email' } })
  })
})

describe('session lifecycle', () => {
  it('restores the user once from refresh without calling a nonexistent profile endpoint', async () => {
    setRefreshToken('saved-refresh')
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.url).toBe('/auth/refresh')
      return response(config, auth)
    })
    axios.defaults.adapter = adapter
    const session = useSessionStore()
    await Promise.all([session.restoreSession(), session.restoreSession()])
    expect(session.currentUser).toEqual(user)
    expect(session.isAuthenticated).toBe(true)
    expect(session.isBootstrapping).toBe(false)
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('restores a guest with no network request when no refresh token exists', async () => {
    const adapter = vi.fn()
    axios.defaults.adapter = adapter
    const session = useSessionStore()
    await session.restoreSession()
    expect(session.isAuthenticated).toBe(false)
    expect(session.isBootstrapping).toBe(false)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('clears local credentials on logout even when the server is unavailable', async () => {
    let offline = false
    axios.defaults.adapter = async (config) => offline ? failure(config, 500) : response(config, auth)
    const session = useSessionStore()
    await session.login({ email: user.email, password: 'secret' })
    offline = true
    await session.logout()
    expect(session.currentUser).toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})

describe('session refresh regressions', () => {
  it('keeps credentials on a temporary refresh server failure', async () => {
    setAccessToken('expired')
    setRefreshToken('saved-refresh')
    axios.defaults.adapter = (config) => failure(config, config.url === '/auth/refresh' ? 503 : 401)
    const unauthorized = vi.fn()
    await expect(createApiClient(unauthorized).get('/rooms')).rejects.toMatchObject({ status: 503 })
    expect(getRefreshToken()).toBe('saved-refresh')
    expect(unauthorized).not.toHaveBeenCalled()
  })

  it('does not restore credentials when a refresh finishes after logout', async () => {
    setAccessToken('expired')
    setRefreshToken('saved-refresh')
    let finish!: () => void
    const waiting = new Promise<void>((resolve) => { finish = resolve })
    const started = vi.fn()
    axios.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        started()
        await waiting
        return response(config, auth)
      }
      return failure(config, 401)
    }
    const unauthorized = vi.fn()
    const request = createApiClient(unauthorized).get('/rooms')
    const rejected = expect(request).rejects.toMatchObject({ status: 401 })
    await vi.waitFor(() => expect(started).toHaveBeenCalledOnce())
    clearSessionTokens()
    finish()
    await rejected
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(unauthorized).not.toHaveBeenCalled()
  })

  it('does not log back in if bootstrap finishes after logout', async () => {
    setRefreshToken('saved-refresh')
    let finish!: () => void
    const waiting = new Promise<void>((resolve) => { finish = resolve })
    axios.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') await waiting
      return response(config, auth)
    }
    const session = useSessionStore()
    const restoring = session.restoreSession()
    await session.logout()
    finish()
    await restoring
    expect(session.currentUser).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
