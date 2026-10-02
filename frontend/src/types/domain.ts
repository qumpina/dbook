export type UserRole = 'ADMIN' | 'TRAINER' | 'USER'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface Room {
  id: number
  name: string
  description: string
  capacity: number
  active: boolean
}

export interface Booking {
  id: number
  roomId: number
  roomName: string
  userEmail: string
  startsAt: string
  endsAt: string
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

export interface CreateRoomRequest {
  name: string
  description: string
  capacity: number
  active: boolean
}

export interface BookRoomRequest {
  roomId: number
  startsAt: string
  endsAt: string
}
