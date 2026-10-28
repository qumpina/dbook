import { expect, test, type Page } from '@playwright/test'
import type { Booking, BookRoomRequest, UserRole } from '../src/types/domain.ts'

const selectedDay = '2035-04-09'
const room = { id: 11, name: 'Тестовый зал', description: 'Зал для проверки календаря', capacity: 12, active: true }
const currentEmail = 'owner@example.test'

function booking(id = 101, start = '08:00:00', end = '09:00:00', day = selectedDay): Booking {
  return { id, roomId: room.id, roomName: room.name, userEmail: currentEmail, startsAt: `${day}T${start}`, endsAt: `${day}T${end}`, createdAt: '2026-01-01T00:00:00Z' }
}

async function openRooms(page: Page, options: {
  bookings?: Booking[]
  role?: UserRole
  deleteStatus?: number
  deleteGate?: Promise<void>
  failBookings?: boolean
  day?: string
} = {}) {
  let bookings = [...(options.bookings ?? [])]
  const deletedIds: number[] = []
  const created: BookRoomRequest[] = []
  await page.addInitScript(() => localStorage.setItem('booking.refreshToken', 'fixture-refresh'))
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/v1/auth/refresh') {
      await route.fulfill({ json: {
        accessToken: 'fixture-access', refreshToken: 'fixture-refresh', tokenType: 'Bearer', expiresIn: 900,
        user: { id: 7, email: currentEmail, firstName: 'Тест', lastName: 'Владелец', role: options.role ?? 'TRAINER' },
      } })
    } else if (path === '/api/v1/rooms') {
      await route.fulfill({ json: [room] })
    } else if (path === '/api/v1/bookings/me') {
      await route.fulfill(options.failBookings
        ? { status: 500, json: { message: 'Internal server error' } }
        : { json: bookings })
    } else if (path === '/api/v1/bookings' && request.method() === 'POST') {
      const payload = request.postDataJSON() as BookRoomRequest
      created.push(payload)
      const result = { ...booking(901), ...payload }
      bookings.push(result)
      await route.fulfill({ status: 201, json: result })
    } else if (/^\/api\/v1\/bookings\/\d+$/.test(path) && request.method() === 'DELETE') {
      const id = Number(path.split('/').at(-1))
      deletedIds.push(id)
      if (options.deleteGate) await options.deleteGate
      const status = options.deleteStatus ?? 204
      if (status === 204 || status === 404) bookings = bookings.filter((item) => item.id !== id)
      await route.fulfill(status === 204 ? { status, body: '' } : { status, json: { message: 'Fixture cancellation error' } })
    } else {
      throw new Error(`Unexpected API request: ${request.method()} ${path}`)
    }
  })
  await page.goto('/rooms')
  await expect(page.getByRole('heading', { name: 'Бронирование зала', exact: true })).toBeVisible()
  await page.getByLabel('Дата', { exact: true }).fill(options.day ?? selectedDay)
  return { deletedIds, created }
}

function slot(page: Page, label = '08:00–09:00') {
  return page.getByRole('button').filter({ hasText: label })
}

function activeToast(page: Page, text: string) {
  return page.locator('[data-sonner-toast][data-removed="false"]').filter({ hasText: text })
}

test('shows DD.MM.YY while creating the same ISO interval, with a centered overlay and immediate close', async ({ page }) => {
  const fixture = await openRooms(page)
  await expect(page.getByTestId('rooms-date-display')).toHaveText('09.04.35')
  await expect(page.getByLabel('Дата', { exact: true })).toHaveValue(selectedDay)
  await slot(page).click()
  await page.getByRole('button', { name: 'Подтвердить', exact: true }).click()
  const toast = activeToast(page, 'Бронирование создано')
  await expect(toast).toBeVisible()
  expect(fixture.created).toEqual([{ roomId: room.id, startsAt: `${selectedDay}T08:00:00`, endsAt: `${selectedDay}T09:00:00` }])
  const heading = page.getByRole('heading', { name: 'Бронирование зала', exact: true })
  const toaster = page.locator('[data-sonner-toaster]')
  await expect(toaster).toHaveCSS('position', 'fixed')
  // Sonner enters from above the viewport; assert the settled overlay position.
  await expect.poll(async () => (await toast.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0)
  const box = await toast.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()!
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(5)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeLessThan(100)
  const progress = await toast.evaluate((element) => {
    const style = getComputedStyle(element, '::after')
    return { animationName: style.animationName, duration: style.animationDuration }
  })
  expect(progress.animationName).not.toBe('none')
  expect(progress.duration).toBe('4s')
  // The same already-visible notification must resize, not keep its desktop width.
  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(async () => {
    const resized = await toast.boundingBox()
    return resized ? Math.abs(resized.x + resized.width / 2 - 187.5) : Infinity
  }).toBeLessThan(5)
  const mobileBox = (await toast.boundingBox())!
  expect(mobileBox.x).toBeGreaterThanOrEqual(16)
  expect(mobileBox.x + mobileBox.width).toBeLessThanOrEqual(359)
  const before = await heading.boundingBox()
  await toast.getByRole('button', { name: 'Закрыть уведомление', exact: true }).click()
  await expect(toast).toBeHidden()
  expect(await heading.boundingBox()).toEqual(before)
})

test('Back sends no cancellation; mobile success frees the slot and dismisses after four seconds', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const fixture = await openRooms(page, { bookings: [booking()] })
  await slot(page).click()
  let dialog = page.getByRole('dialog', { name: 'Отмена бронирования' })
  await expect(dialog).toContainText(room.name)
  await expect(dialog).toContainText('08:00')
  await expect(dialog).toContainText('09:00')
  await dialog.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(fixture.deletedIds).toEqual([])
  await slot(page).click()
  dialog = page.getByRole('dialog', { name: 'Отмена бронирования' })
  await dialog.getByRole('button', { name: 'Отменить бронирование', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(slot(page)).toContainText('Выбрать время')
  await expect(slot(page)).toBeEnabled()
  expect(fixture.deletedIds).toEqual([101])
  const toast = activeToast(page, 'Бронирование отменено')
  await expect(toast).toBeVisible()
  const box = (await toast.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(8)
  expect(box.x + box.width).toBeLessThanOrEqual(367)
  expect(Math.abs(box.x + box.width / 2 - 187.5)).toBeLessThan(5)
  await page.mouse.move(0, 810)
  await page.waitForTimeout(2500)
  await expect(toast).toBeVisible()
  await expect(toast).toBeHidden({ timeout: 2200 })
  await page.reload()
  await page.getByLabel('Дата', { exact: true }).fill(selectedDay)
  await expect(slot(page)).toContainText('Выбрать время')
})

test('a pending cancellation cannot be sent twice', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  try {
    const fixture = await openRooms(page, { bookings: [booking()], deleteGate: gate })
    await slot(page).click()
    const button = page.getByRole('dialog', { name: 'Отмена бронирования' }).getByRole('button', { name: /Отмен/ })
    await button.click()
    await expect.poll(() => fixture.deletedIds.length).toBe(1)
    await expect(button).toBeDisabled()
    await button.dispatchEvent('click')
    expect(fixture.deletedIds).toEqual([101])
    release()
    await expect(page.getByRole('dialog', { name: 'Отмена бронирования' })).toBeHidden()
    await expect(slot(page)).toContainText('Выбрать время')
  } finally {
    release()
  }
})

test('cancels only the selected partial booking when an hourly slot contains several own bookings', async ({ page }) => {
  const fixture = await openRooms(page, { bookings: [booking(101, '08:00:00', '08:15:00'), booking(102, '08:30:00', '08:45:00')] })
  await slot(page).click()
  let dialog = page.getByRole('dialog', { name: 'Отмена бронирования' })
  await dialog.getByRole('combobox', { name: 'Выберите бронирование', exact: true }).selectOption('102')
  await expect(dialog).toContainText('08:30')
  await expect(dialog).toContainText('08:45')
  await dialog.getByRole('button', { name: 'Отменить бронирование', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(fixture.deletedIds).toEqual([102])
  await expect(slot(page)).toContainText('Ваша бронь')
  await slot(page).click()
  dialog = page.getByRole('dialog', { name: 'Отмена бронирования' })
  await expect(dialog).toContainText('08:15')
  await expect(dialog.getByRole('combobox', { name: 'Выберите бронирование', exact: true })).toHaveCount(0)
})

test('server cancellation errors preserve the booking and modal for retry', async ({ page }) => {
  await openRooms(page, { bookings: [booking()], deleteStatus: 500 })
  await slot(page).click()
  const dialog = page.getByRole('dialog', { name: 'Отмена бронирования' })
  await dialog.getByRole('button', { name: 'Отменить бронирование', exact: true }).click()
  await expect(activeToast(page, 'Ошибка сервера')).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(slot(page)).toContainText('Ваша бронь')
  await expect(dialog.getByRole('button', { name: 'Отменить бронирование', exact: true })).toBeEnabled()
})

test('a booking already deleted elsewhere is reconciled after API 404', async ({ page }) => {
  await openRooms(page, { bookings: [booking()], deleteStatus: 404 })
  await slot(page).click()
  await page.getByRole('dialog', { name: 'Отмена бронирования' }).getByRole('button', { name: 'Отменить бронирование', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Отмена бронирования' })).toBeHidden()
  await expect(slot(page)).toContainText('Выбрать время')
  await expect(slot(page)).toBeEnabled()
})

test('a USER can cancel a past own booking but a foreign booking stays disabled', async ({ page }) => {
  const day = '2020-01-02'
  const fixture = await openRooms(page, { role: 'USER', day, bookings: [booking(101, '08:00:00', '09:00:00', day), { ...booking(102, '09:00:00', '10:00:00', day), userEmail: 'other@example.test' }] })
  await expect(slot(page, '09:00–10:00')).toBeDisabled()
  await expect(slot(page, '09:00–10:00')).toContainText('Прошло')
  await expect(slot(page)).toContainText('Прошло')
  await expect(slot(page)).toBeEnabled()
  await slot(page).click()
  await page.getByRole('dialog', { name: 'Отмена бронирования' }).getByRole('button', { name: 'Отменить бронирование', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Отмена бронирования' })).toBeHidden()
  expect(fixture.deletedIds).toEqual([101])
  await expect(slot(page, '09:00–10:00')).toBeDisabled()
})

test('failed initial booking loading does not expose unchecked slots as bookable', async ({ page }) => {
  await openRooms(page, { failBookings: true })
  await expect(activeToast(page, 'Ошибка сервера')).toBeVisible()
  const available = page.getByRole('button').filter({ hasText: 'Выбрать время' })
  await expect(available.and(page.locator(':enabled'))).toHaveCount(0)
})

test('finished bookings show Прошло at their end time while active and future bookings keep their status', async ({ page }) => {
  const now = new Date(`${selectedDay}T06:00:00Z`) // 09:00 Moscow
  await page.clock.install({ time: now })
  await page.clock.pauseAt(now)
  await openRooms(page, { bookings: [booking(), booking(102, '09:00:00', '10:00:00'), booking(103, '10:00:00', '11:00:00')] })
  await expect(slot(page)).toContainText('Прошло')
  await expect(slot(page)).toHaveClass(/bg-slate-100/)
  await expect(slot(page)).toBeEnabled() // Cancellation rules stay unchanged.
  await expect(slot(page, '09:00–10:00')).toContainText('Ваша бронь')
  await expect(slot(page, '10:00–11:00')).toContainText('Ваша бронь')
  await page.clock.fastForward(60 * 60 * 1000)
  await expect(slot(page, '09:00–10:00')).toContainText('Прошло')
  await expect(slot(page, '10:00–11:00')).toContainText('Ваша бронь')
})

test('an empty slot stops offering booking at its start and becomes past only at its end', async ({ page }) => {
  const now = new Date(`${selectedDay}T04:59:59Z`) // 07:59:59 Moscow
  await page.clock.install({ time: now })
  await page.clock.pauseAt(now)
  await openRooms(page)
  await expect(slot(page)).toContainText('Выбрать время')
  await expect(slot(page)).toBeEnabled()
  await page.clock.fastForward(1000)
  await expect(slot(page)).toContainText('Уже началось')
  await expect(slot(page)).toBeDisabled()
  await page.clock.fastForward(30 * 60 * 1000)
  await expect(slot(page)).toContainText('Уже началось')
  await page.clock.fastForward(30 * 60 * 1000)
  await expect(slot(page)).toContainText('Прошло')
  await expect(slot(page)).toBeDisabled()
})

test('uses actual booking ends for partial and multi-hour bookings', async ({ page }) => {
  const now = new Date(`${selectedDay}T05:15:00Z`) // 08:15 Moscow
  await page.clock.install({ time: now })
  await page.clock.pauseAt(now)
  await openRooms(page, { bookings: [
    booking(101, '08:00:00', '08:15:00'),
    booking(102, '09:00:00', '09:15:00'),
    booking(103, '09:30:00', '09:45:00'),
    booking(104, '11:00:00', '13:00:00'),
  ] })
  await expect(slot(page)).toContainText('Прошло')
  await page.clock.fastForward(60 * 60 * 1000)
  await expect(slot(page, '09:00–10:00')).toContainText('Ваша бронь')
  await page.clock.fastForward(30 * 60 * 1000)
  await expect(slot(page, '09:00–10:00')).toContainText('Прошло')
  await page.clock.fastForward(135 * 60 * 1000) // 12:00 Moscow
  await expect(slot(page, '10:00–11:00')).toContainText('Прошло') // Empty finished slot.
  await expect(slot(page, '11:00–12:00')).toContainText('Ваша бронь') // Booking still ongoing.
  await expect(slot(page, '12:00–13:00')).toContainText('Ваша бронь')
})

test('My bookings hides completed records by default and preserves the filter after refreshing the list', async ({ page }) => {
  const now = new Date(`${selectedDay}T06:00:00Z`)
  await page.clock.install({ time: now })
  await page.clock.pauseAt(now)
  const fixture = await openRooms(page, { bookings: [
    { ...booking(), roomName: 'Прошедшая бронь' },
    { ...booking(102, '08:30:00', '09:30:00'), roomName: 'Текущая бронь' },
    { ...booking(103, '10:00:00', '11:00:00'), roomName: 'Будущая бронь' },
  ] })
  await page.getByRole('button', { name: 'Мои брони', exact: true }).click()
  const toggle = page.getByRole('switch', { name: 'Показывать прошедшие' })
  await expect(toggle).not.toBeChecked()
  await expect(page.getByText('Прошедшая бронь', { exact: true })).toBeHidden()
  await expect(page.getByText('Текущая бронь', { exact: true })).toBeVisible()
  await expect(page.getByText('Будущая бронь', { exact: true })).toBeVisible()
  await toggle.check()
  await expect(page.getByText('Прошедшая бронь', { exact: true })).toBeVisible()
  const futureCard = page.locator('div.rounded-2xl').filter({ hasText: 'Будущая бронь' })
  await futureCard.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.getByText('Будущая бронь', { exact: true })).toBeHidden()
  expect(fixture.deletedIds).toEqual([103])
  await expect(toggle).toBeChecked()
  await expect(page.getByText('Прошедшая бронь', { exact: true })).toBeVisible()
  await toggle.uncheck()
  await expect(page.getByText('Прошедшая бронь', { exact: true })).toBeHidden()
  await expect(page.getByText('Текущая бронь', { exact: true })).toBeVisible()
  await page.clock.fastForward(30 * 60 * 1000)
  await expect(page.getByText('Текущая бронь', { exact: true })).toBeHidden()
  await expect(page.getByText('Нет актуальных и будущих бронирований.', { exact: false })).toBeVisible()
  await toggle.check()
  await expect(page.getByText('Текущая бронь', { exact: true })).toBeVisible()
  await expect(page.getByText('Прошедшая бронь', { exact: true })).toBeVisible()
})
