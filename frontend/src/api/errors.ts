import type { AxiosError } from 'axios'
import { AppError } from '@/types/errors'

export function normalizeHttpError(error: unknown): AppError {
  if (error instanceof AppError) return error
  const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string> }>
  if (!axiosError.response) {
    return new AppError('Ошибка сети. Проверьте подключение и повторите попытку.', 'NETWORK_ERROR')
  }

  const { status, data } = axiosError.response
  const path = axiosError.config?.url ?? ''
  if (status === 401) {
    return new AppError(
      path.endsWith('/auth/login') ? 'Неверный email или пароль.' : 'Сессия истекла. Войдите снова.',
      'UNAUTHORIZED', status,
    )
  }
  if (status === 403) {
    return new AppError('Недостаточно прав для выполнения операции.', 'FORBIDDEN', status)
  }
  if (status === 404) {
    return new AppError('Запрошенный ресурс не найден.', 'NOT_FOUND', status)
  }
  if (status === 409) {
    if (path.endsWith('/auth/register')) {
      return new AppError('Аккаунт с таким email уже существует. Войдите в него.', 'CONFLICT', status)
    }
    if (path.endsWith('/rooms')) {
      return new AppError('Зал с таким названием уже существует.', 'CONFLICT', status)
    }
    return new AppError('Выбранное время уже занято.', 'TIME_CONFLICT', status)
  }
  if (status >= 500) {
    return new AppError('Ошибка сервера. Попробуйте позже.', 'SERVER_ERROR', status)
  }
  if (status === 400 && data?.errors) {
    return new AppError('Проверьте заполнение полей.', 'VALIDATION_ERROR', status, data.errors)
  }
  return new AppError(data?.message ?? 'Не удалось выполнить запрос.', 'UNKNOWN', status)
}
