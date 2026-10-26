export const routePaths = {
  login: '/login',
  register: '/register',
  rooms: '/rooms',
  schedule: '/schedule',
  myBookings: '/my-bookings',
  profile: '/profile',
  admin: '/admin',
} as const


export function getAuthRedirect(value: unknown): string {
  if (typeof value !== 'string') return routePaths.rooms
  const path = value.split(/[?#]/)[0]
  const allowed: string[] = [routePaths.rooms, routePaths.schedule, routePaths.myBookings, routePaths.profile, routePaths.admin]
  return path && allowed.includes(path) ? value : routePaths.rooms
}
