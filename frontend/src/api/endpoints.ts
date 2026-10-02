import type { AxiosInstance } from 'axios'
import type {
  AuthResponse,
  BookRoomRequest,
  Booking,
  CreateRoomRequest,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
  Room,
  User,
} from '@/types/domain'

export class ApiService {
  constructor(private readonly client: AxiosInstance) {}

  register(payload: RegisterRequest) {
    return this.client.post<AuthResponse>('/auth/register', payload)
  }

  login(payload: LoginRequest) {
    return this.client.post<AuthResponse>('/auth/login', payload, {
      headers: {
        'x-skip-auth': '1',
        'x-skip-refresh': '1',
      },
    })
  }

  refresh(payload: RefreshRequest) {
    return this.client.post<AuthResponse>('/auth/refresh', payload, {
      headers: {
        'x-skip-auth': '1',
        'x-skip-refresh': '1',
      },
    })
  }

  logout(payload: LogoutRequest) {
    return this.client.post<void>('/auth/logout', payload)
  }

  getRooms() {
    return this.client.get<Room[]>('/rooms')
  }

  createRoom(payload: CreateRoomRequest) {
    return this.client.post<Room>('/rooms', payload)
  }

  getMyBookings() {
    return this.client.get<Booking[]>('/bookings/me')
  }

  createBooking(payload: BookRoomRequest) {
    return this.client.post<Booking>('/bookings', payload)
  }

  getMe() {
    return this.client.get<User>('/users/me')
  }
}
