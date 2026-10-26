import { describe, expect, it } from 'vitest'
import { areIntervalsOverlapping, assertFullHourSlot, createHourlySlots } from '@/utils/timeSlots'

describe('time slot rules', () => {
  it('creates one slot per hour', () => {
    const slots = createHourlySlots(new Date('2026-01-01T08:00:00'), new Date('2026-01-01T11:00:00'))

    expect(slots).toHaveLength(3)
    expect(assertFullHourSlot(slots[0]!)).toBe(true)
    expect(assertFullHourSlot(slots[1]!)).toBe(true)
    expect(assertFullHourSlot(slots[2]!)).toBe(true)
  })

  it('detects interval overlap', () => {
    const first = {
      startsAt: new Date('2026-01-01T09:00:00'),
      endsAt: new Date('2026-01-01T10:00:00'),
    }

    const second = {
      startsAt: new Date('2026-01-01T09:30:00'),
      endsAt: new Date('2026-01-01T10:30:00'),
    }

    expect(areIntervalsOverlapping(first, second)).toBe(true)
  })

  it('allows adjacent non-overlapping intervals', () => {
    const first = {
      startsAt: new Date('2026-01-01T09:00:00'),
      endsAt: new Date('2026-01-01T10:00:00'),
    }

    const second = {
      startsAt: new Date('2026-01-01T10:00:00'),
      endsAt: new Date('2026-01-01T11:00:00'),
    }

    expect(areIntervalsOverlapping(first, second)).toBe(false)
  })
})
