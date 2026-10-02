export type AppErrorCode =
  | 'FORBIDDEN'
  | 'TIME_CONFLICT'
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export class AppError extends Error {
  code: AppErrorCode
  status?: number

  constructor(message: string, code: AppErrorCode, status?: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}
