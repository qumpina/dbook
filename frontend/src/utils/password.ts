export function passwordError(password: string): string | undefined {
  if (password.length < 6) return 'Пароль должен содержать минимум 6 символов'
  if (new TextEncoder().encode(password).length > 72) return 'Пароль слишком длинный: максимум 72 байта UTF-8 (72 латинских или 36 русских букв)'
  return undefined
}
