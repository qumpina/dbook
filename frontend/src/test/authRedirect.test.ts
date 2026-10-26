import { expect, it } from 'vitest'
import { getAuthRedirect } from '@/router/routes'

it('retains an internal protected destination and query', () => {
  expect(getAuthRedirect('/profile?tab=details')).toBe('/profile?tab=details')
})

it.each([undefined, ['profile'], 'https://example.com', '//example.com', '/\\example.com', '/login', '/register', '/unknown'])('rejects invalid redirect %s', (value) => {
  expect(getAuthRedirect(value)).toBe('/rooms')
})
