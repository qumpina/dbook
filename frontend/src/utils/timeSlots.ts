export interface TimeSlot {
  startsAt: Date
  endsAt: Date
}

const SLOT_MS = 60 * 60 * 1000

export function createHourlySlots(dayStart: Date, dayEnd: Date): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (let time = dayStart.getTime(); time < dayEnd.getTime(); time += SLOT_MS) {
    slots.push({
      startsAt: new Date(time),
      endsAt: new Date(time + SLOT_MS),
    })
  }

  return slots
}

export function areIntervalsOverlapping(a: TimeSlot, b: TimeSlot): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt
}

export function assertFullHourSlot(slot: TimeSlot): boolean {
  return slot.endsAt.getTime() - slot.startsAt.getTime() === SLOT_MS
}
