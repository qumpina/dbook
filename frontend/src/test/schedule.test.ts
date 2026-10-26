import { describe, expect, it } from 'vitest'
import { createScheduleSlots, formatMoscowDateTime, hasOverlap, moscowDateInput, parseServerDateTime, toServerLocalDateTime } from '@/config/schedule'

describe('Moscow studio calendar', () => {
  it('uses the Moscow calendar day when UTC and the browser are still on the previous date', () => {
    expect(moscowDateInput(new Date('2030-01-01T22:30:00Z'))).toBe('2030-01-02')
  })
  it('round trips a server timestamp through the same instant regardless of browser timezone', () => {
    const instant = parseServerDateTime('2030-01-02T08:00:00')
    expect(instant.toISOString()).toBe('2030-01-02T05:00:00.000Z')
    expect(toServerLocalDateTime(instant)).toBe('2030-01-02T08:00:00')
    expect(formatMoscowDateTime('2030-01-02T08:00:00')).toContain('08:00')
  })
  it('marks a saved booking as overlapping the same displayed slot, but allows the adjacent slot', () => {
    const slots = createScheduleSlots('2030-01-02')
    expect(slots).toHaveLength(14)
    expect(slots[0]!.label).toBe('08:00–09:00')
    expect(slots.at(-1)!.label).toBe('21:00–22:00')
    const start = parseServerDateTime('2030-01-02T08:00:00')
    const end = parseServerDateTime('2030-01-02T09:00:00')
    expect(hasOverlap(slots[0]!.startsAt, slots[0]!.endsAt, start, end)).toBe(true)
    expect(hasOverlap(slots[1]!.startsAt, slots[1]!.endsAt, start, end)).toBe(false)
  })
  it('does not create slots when the date field is empty', () => {
    expect(createScheduleSlots('')).toEqual([])
  })
})
