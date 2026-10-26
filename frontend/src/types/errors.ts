export type AppErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TIME_CONFLICT'
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'

export class AppError extends Error {
  code: AppErrorCode
  status?: number
  fieldErrors: Record<string, string>

  constructor(message: string, code: AppErrorCode, status?: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
  }
}
