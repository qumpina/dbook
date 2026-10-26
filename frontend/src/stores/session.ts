import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiService } from '@/api/endpoints'
import { createApiClient } from '@/api/client'
import {
  clearSessionTokens,
  getRefreshToken,
  getSessionVersion,
  setAccessToken,
  setRefreshToken,
} from '@/api/sessionTokens'
import { normalizeHttpError } from '@/api/errors'
import type { LoginRequest, RegisterRequest, User } from '@/types/domain'

export const useSessionStore = defineStore('session', () => {
  const currentUser = ref<User | null>(null)
  const isBootstrapping = ref(true)
  const flashMessage = ref<string | null>(null)

  const client = createApiClient(() => {
    clearSessionTokens()
    currentUser.value = null
    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  })

  const api = new ApiService(client)

  const isAuthenticated = computed(() => currentUser.value !== null)

  function setFlash(message: string | null) {
    flashMessage.value = message
  }

  function clearFlash() {
    flashMessage.value = null
  }

  function applyAuth(payload: { accessToken: string; refreshToken: string; user: User }) {
    clearSessionTokens()
    setAccessToken(payload.accessToken)
    setRefreshToken(payload.refreshToken)
    currentUser.value = payload.user
    clearFlash()
  }

  async function login(payload: LoginRequest) {
    const { data } = await api.login(payload)
    applyAuth(data)
  }

  async function register(payload: RegisterRequest) {
    const { data } = await api.register(payload)
    applyAuth(data)
  }

  async function logout() {
    const refreshToken = getRefreshToken()

    // Clear locally before awaiting the server so an in-flight refresh cannot restore logout.
    clearSessionTokens()
    currentUser.value = null
    clearFlash()
    if (refreshToken) {
      try {
        await api.logout({ refreshToken })
      } catch {
        // The local session stays logged out even when the server is unreachable.
      }
    }
  }

  let restorePromise: Promise<void> | null = null

  function restoreSession(): Promise<void> {
    restorePromise ??= restore()
    return restorePromise
  }

  async function restore() {
    isBootstrapping.value = true
    const version = getSessionVersion()

    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        currentUser.value = null
        return
      }

      const { data } = await api.refresh({ refreshToken })
      if (version === getSessionVersion()) applyAuth(data)
    } catch (error) {
      if (version === getSessionVersion()) {
        const normalized = normalizeHttpError(error)
        if (normalized.status === 401 || normalized.status === 403) clearSessionTokens()
        currentUser.value = null
        setFlash(normalized.message)
      }
    } finally {
      isBootstrapping.value = false
    }
  }

  return {
    api,
    currentUser,
    isAuthenticated,
    isBootstrapping,
    flashMessage,
    setFlash,
    clearFlash,
    login,
    register,
    logout,
    restoreSession,
  }
})
