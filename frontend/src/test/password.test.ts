import { expect, it } from 'vitest'
import { passwordError } from '@/utils/password'

it('checks the BCrypt UTF-8 limit instead of character count', () => {
  expect(passwordError('a'.repeat(72))).toBeUndefined()
  expect(passwordError('я'.repeat(36))).toBeUndefined()
  expect(passwordError('a'.repeat(73))).toContain('72 байта')
  expect(passwordError('я'.repeat(37))).toContain('72 байта')
  expect(passwordError('short')).toContain('минимум 6')
})
