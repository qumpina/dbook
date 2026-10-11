import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiService } from '@/api/endpoints'
import { createApiClient } from '@/api/client'
import {
  clearSessionTokens,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/api/sessionTokens'
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

  async function loadProfile() {
    const response = await api.getMe().catch(() => null)
    if (response) {
      currentUser.value = response.data
    }
  }

  async function logout() {
    const refreshToken = getRefreshToken()

    if (refreshToken) {
      try {
        await api.logout({ refreshToken })
      } catch {
        // noop: logout should still clear local session
      }
    }

    clearSessionTokens()
    currentUser.value = null
    clearFlash()
  }

  async function restoreSession() {
    isBootstrapping.value = true

    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        currentUser.value = null
        return
      }

      const { data } = await api.refresh({ refreshToken })
      applyAuth(data)
      await loadProfile()
    } catch {
      clearSessionTokens()
      currentUser.value = null
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
    loadProfile,
    logout,
    restoreSession,
  }
})
