import type { AxiosError } from 'axios'
import { AppError } from '@/types/errors'

export function normalizeHttpError(error: unknown): AppError {
  const axiosError = error as AxiosError<{ message?: string }>

  if (!axiosError.response) {
    return new AppError('Ошибка сети. Проверьте подключение.', 'NETWORK_ERROR')
  }

  const { status, data } = axiosError.response

  if (status === 401) {
    return new AppError('Сессия истекла. Войдите снова.', 'UNAUTHORIZED', status)
  }

  if (status === 403) {
    return new AppError('Недостаточно прав для выполнения операции.', 'FORBIDDEN', status)
  }

  if (status === 409) {
    return new AppError('Выбранное время уже занято.', 'TIME_CONFLICT', status)
  }

  if (status >= 500) {
    return new AppError('Ошибка сервера. Попробуйте позже.', 'SERVER_ERROR', status)
  }

  return new AppError(data?.message ?? 'Не удалось выполнить запрос.', 'UNKNOWN', status)
}
