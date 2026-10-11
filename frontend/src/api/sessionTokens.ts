const ACCESS_TOKEN_KEY = 'booking.accessToken'
const REFRESH_TOKEN_KEY = 'booking.refreshToken'

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken ?? localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string | null): void {
  accessToken = token

  if (!token) {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    return
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    return
  }

  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function clearSessionTokens(): void {
  accessToken = null
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
