import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { normalizeHttpError } from '@/api/errors'
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/api/sessionTokens'
import type { AuthResponse } from '@/types/domain'

const API_URL = import.meta.env.VITE_API_URL

let refreshPromise: Promise<string> | null = null

function shouldSkipAuth(config: InternalAxiosRequestConfig): boolean {
  return Boolean(config.headers['x-skip-auth'])
}

function shouldSkipRefresh(config: InternalAxiosRequestConfig): boolean {
  return Boolean(config.headers['x-skip-refresh'])
}

async function refreshAccessToken(baseClient: AxiosInstance): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw normalizeHttpError(new AxiosError('No refresh token'))
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

  setAccessToken(response.data.accessToken)
  setRefreshToken(response.data.refreshToken)

  return response.data.accessToken
}

export function createApiClient(onUnauthorized: () => void): AxiosInstance {
  const client = axios.create({
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
        originalRequest._retry = true

        if (!refreshPromise) {
          refreshPromise = refreshAccessToken(client).finally(() => {
            refreshPromise = null
          })
        }

        try {
          const token = await refreshPromise
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        } catch {
          clearSessionTokens()
          onUnauthorized()
          throw normalizeHttpError(error)
        }
      }

      throw normalizeHttpError(error)
    },
  )

  return client
}
