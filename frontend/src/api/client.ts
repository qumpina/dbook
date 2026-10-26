import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { normalizeHttpError } from '@/api/errors'
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  getSessionVersion,
  setAccessToken,
  setRefreshToken,
} from '@/api/sessionTokens'
import { AppError } from '@/types/errors'
import type { AuthResponse } from '@/types/domain'

const API_URL = import.meta.env.VITE_API_URL?.trim() || '/api/v1'

function shouldSkipAuth(config: InternalAxiosRequestConfig): boolean {
  return Boolean(config.headers['x-skip-auth'])
}

function shouldSkipRefresh(config: InternalAxiosRequestConfig): boolean {
  return Boolean(config.headers['x-skip-refresh'])
}

async function refreshAccessToken(baseClient: AxiosInstance): Promise<string> {
  const version = getSessionVersion()
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new AppError('Сессия истекла. Войдите снова.', 'UNAUTHORIZED', 401)
  }

  const response = await baseClient.post<AuthResponse>(
    '/auth/refresh',
    { refreshToken },
    {
      headers: {
        'x-skip-auth': '1',
        'x-skip-refresh': '1',
      },
    },
  )

  if (version !== getSessionVersion()) {
    throw new AppError('Сессия была изменена. Повторите запрос.', 'UNAUTHORIZED', 401)
  }
  setAccessToken(response.data.accessToken)
  setRefreshToken(response.data.refreshToken)

  return response.data.accessToken
}

export function createApiClient(onUnauthorized: () => void): AxiosInstance {
  let refreshPromise: Promise<string> | null = null
  const client = axios.create({
    timeout: 15000,
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((config) => {
    if (!shouldSkipAuth(config)) {
      const token = getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

      if (!error.response || !originalRequest) {
        throw normalizeHttpError(error)
      }

      if (
        error.response.status === 401 &&
        !originalRequest._retry &&
        !shouldSkipRefresh(originalRequest)
      ) {
        const version = getSessionVersion()
        originalRequest._retry = true
        const currentToken = getAccessToken()
        if (currentToken && originalRequest.headers.Authorization !== `Bearer ${currentToken}`) {
          originalRequest.headers.Authorization = `Bearer ${currentToken}`
          return client(originalRequest)
        }

        if (!refreshPromise) {
          refreshPromise = refreshAccessToken(client).finally(() => {
            refreshPromise = null
          })
        }

        try {
          const token = await refreshPromise
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        } catch (refreshError) {
          const normalized = normalizeHttpError(refreshError)
          if (version === getSessionVersion() && (normalized.status === 401 || normalized.status === 403 || !getRefreshToken())) {
            clearSessionTokens()
            onUnauthorized()
          }
          throw normalized
        }
      }

      if (error.response.status === 401 && originalRequest._retry && !shouldSkipRefresh(originalRequest)) {
        clearSessionTokens()
        onUnauthorized()
      }
      throw normalizeHttpError(error)
    },
  )

  return client
}
