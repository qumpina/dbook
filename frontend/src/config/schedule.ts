export interface ScheduleSlot {
  startsAt: Date
  endsAt: Date
  label: string
}

export const MOSCOW_TIMEZONE = 'Europe/Moscow'
export const WORKDAY_START_HOUR = 8
export const WORKDAY_END_HOUR = 22
export const SLOT_DURATION_MS = 60 * 60 * 1000
export const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000

export function parseServerDateTime(value: string): Date {
  // API timestamps have no offset and represent studio wall time in Moscow.
  return new Date(`${value}+03:00`)
}

export function toServerLocalDateTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: MOSCOW_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {})

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

export function formatMoscowDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    ...options,
  }).format(date)
}

export function formatMoscowTime(date: Date): string {
  return formatMoscowDate(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatMoscowDateTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parseServerDateTime(value))
}

export function moscowDateInput(date = new Date()): string {
  return toServerLocalDateTime(date).slice(0, 10)
}

export function createScheduleSlots(day: string): ScheduleSlot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return []
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]

  const start = new Date(Date.UTC(year, month - 1, date, WORKDAY_START_HOUR, 0, 0) - MOSCOW_OFFSET_MS)
  const end = new Date(Date.UTC(year, month - 1, date, WORKDAY_END_HOUR, 0, 0) - MOSCOW_OFFSET_MS)

  const slots: ScheduleSlot[] = []
  for (let current = new Date(start); current < end; current = new Date(current.getTime() + SLOT_DURATION_MS)) {
    const next = new Date(current.getTime() + SLOT_DURATION_MS)
    slots.push({
      startsAt: new Date(current),
      endsAt: new Date(next),
      label: `${formatMoscowTime(new Date(current))}–${formatMoscowTime(new Date(next))}`,
    })
  }

  return slots
}

export function hasOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA
}

export function formatHour(date: Date): string {
  return formatMoscowTime(date)
}
