<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import CalendarDateInput from '@/components/CalendarDateInput.vue'
import BookingDialog from '@/components/BookingDialog.vue'
import { useCurrentTime } from '@/composables/useCurrentTime'
import { useSessionStore } from '@/stores/session'
import type { Booking, Room } from '@/types/domain'
import { createScheduleSlots, hasEnded, hasOverlap, toServerLocalDateTime, parseServerDateTime, formatMoscowDate, moscowDateInput } from '@/config/schedule'

const session = useSessionStore()
const now = useCurrentTime()
const canBook = computed(() => ['ADMIN', 'TRAINER'].includes(session.currentUser?.role ?? ''))
const rooms = ref<Room[]>([])
const bookings = ref<Booking[]>([])
const selectedRoomId = ref<number | null>(null)
const dateInput = ref(moscowDateInput())
const loading = ref(true)
const bookingsReady = ref(false)
const loadError = ref('')
const isCancelling = ref(false)
const isMutating = computed(() => isSubmitting.value || isCancelling.value)
const cancellationChoices = ref<Booking[]>([])
const cancellationBookingId = ref('')
const cancellationBooking = computed(() => cancellationChoices.value.find((booking) => String(booking.id) === cancellationBookingId.value) ?? null)
const isSubmitting = ref(false)
const pendingSlotKey = ref<string | null>(null)
const confirmationSlot = ref<{ startsAt: Date; endsAt: Date; roomId: number; roomName: string } | null>(null)

const selectedRoom = computed(() => {
  return rooms.value.find((room) => room.id === selectedRoomId.value) ?? rooms.value[0] ?? null
})

const scheduleSlots = computed(() => {
  if (!selectedRoom.value) {
    return []
  }

  const roomId = selectedRoom.value.id

  return createScheduleSlots(dateInput.value).map((slot) => {
    const slotStart = new Date(slot.startsAt)
    const slotEnd = new Date(slot.endsAt)
    const slotKey = `${toServerLocalDateTime(slotStart)}|${toServerLocalDateTime(slotEnd)}`

    const overlappingBookings = bookings.value.filter((booking) => {
      if (booking.roomId !== roomId) {
        return false
      }

      const bookingStart = parseServerDateTime(booking.startsAt)
      const bookingEnd = parseServerDateTime(booking.endsAt)
      return hasOverlap(slotStart, slotEnd, bookingStart, bookingEnd)
    })

    const occupied = overlappingBookings.length > 0
    const ownBookings = overlappingBookings.filter(isOwnBooking)
    const hasStarted = slotStart.getTime() <= now.value.getTime()
    // A slot can contain shorter bookings or part of a longer booking.
    // Keep it current while any overlapping booking has yet to end.
    const isPast = occupied
      ? overlappingBookings.every((booking) => hasEnded(booking.endsAt, now.value))
      : hasEnded(slotEnd, now.value)
    const isPending = pendingSlotKey.value === slotKey

    return {
      ...slot,
      occupied: occupied || isPending,
      ownBookings,
      disabled: !bookingsReady.value || isMutating.value || (!ownBookings.length && (!canBook.value || hasStarted || occupied)),
      hasStarted,
      isPast,
      isPending,
      slotKey,
    }
  })
})

function isOwnBooking(booking: Booking) {
  const email = session.currentUser?.email.toLowerCase()
  return Boolean(email && booking.userEmail?.toLowerCase() === email)
}

async function loadBookings() {
  try {
    const response = await session.api.getMyBookings()
    bookings.value = response.data
    bookingsReady.value = true
  } catch (error) {
    bookingsReady.value = false
    throw error
  }
}

async function loadRooms() {
  const response = await session.api.getRooms()
  rooms.value = response.data

  if (!selectedRoomId.value && response.data[0]) {
    selectedRoomId.value = response.data[0].id
  }
}

async function loadData() {
  loading.value = true
  loadError.value = ''
  try {
    await Promise.all([loadRooms(), loadBookings()])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить данные зала'
    loadError.value = message
    toast.error(message)
  } finally {
    loading.value = false
  }
}

function openConfirmation(slot: { startsAt: Date; endsAt: Date; ownBookings: Booking[]; disabled: boolean }) {
  if (slot.disabled || !selectedRoom.value || isMutating.value) {
    return
  }

  if (slot.ownBookings.length) {
    cancellationChoices.value = slot.ownBookings
    cancellationBookingId.value = String(slot.ownBookings[0]!.id)
    return
  }
  if (!canBook.value) return
  confirmationSlot.value = { ...slot, roomId: selectedRoom.value.id, roomName: selectedRoom.value.name }
}

async function confirmBooking() {
  if (!confirmationSlot.value || !canBook.value || !bookingsReady.value || isMutating.value) {
    return
  }

  const slot = confirmationSlot.value
  const startsAt = toServerLocalDateTime(new Date(slot.startsAt))
  const endsAt = toServerLocalDateTime(new Date(slot.endsAt))
  const slotKey = `${startsAt}|${endsAt}`

  isSubmitting.value = true
  pendingSlotKey.value = slotKey

  const optimisticBooking: Booking = {
    id: Date.now(),
    roomId: slot.roomId,
    roomName: slot.roomName,
    userEmail: session.currentUser?.email ?? '',
    startsAt,
    endsAt,
    createdAt: new Date().toISOString(),
  }

  bookings.value = [...bookings.value, optimisticBooking]

  try {
    const { data } = await session.api.createBooking({
      roomId: slot.roomId,
      startsAt,
      endsAt,
    })
    bookings.value = bookings.value.map((booking) => booking.id === optimisticBooking.id ? data : booking)
    toast.success('Бронирование создано')
    confirmationSlot.value = null
  } catch (error) {
    bookings.value = bookings.value.filter((booking) => booking.id !== optimisticBooking.id)
    pendingSlotKey.value = null

    if (error instanceof Error && 'status' in error && error.status === 409) {
      toast.error('Это время уже занято')
      await loadBookings().catch(() => { loadError.value = 'Не удалось обновить список бронирований. Повторите загрузку.' })
      confirmationSlot.value = null
      return
    }

    const message = error instanceof Error ? error.message : 'Не удалось создать бронь'
    toast.error(message)
    confirmationSlot.value = null
  } finally {
    isSubmitting.value = false
    pendingSlotKey.value = null
  }
}

function closeCancellation() {
  if (!isMutating.value) cancellationChoices.value = []
}

async function cancelBooking() {
  const booking = cancellationBooking.value
  if (!booking || !isOwnBooking(booking) || !bookingsReady.value || isMutating.value) return
  isCancelling.value = true
  try {
    await session.api.deleteBooking(booking.id)
    bookings.value = bookings.value.filter((item) => item.id !== booking.id)
    cancellationChoices.value = []
    toast.success('Бронирование отменено')
  } catch (error) {
    const missing = error instanceof Error && 'status' in error && error.status === 404
    toast.error(missing ? 'Бронирование уже отменено. Календарь обновлён.' : error instanceof Error ? error.message : 'Не удалось отменить бронирование')
    if (missing) {
      bookings.value = bookings.value.filter((item) => item.id !== booking.id)
      cancellationChoices.value = []
    }
    try {
      await loadBookings()
      if (missing) bookings.value = bookings.value.filter((item) => item.id !== booking.id)
      cancellationChoices.value = cancellationChoices.value.filter((item) => bookings.value.some((current) => current.id === item.id && isOwnBooking(current)))
      if (!cancellationBooking.value && cancellationChoices.value[0]) cancellationBookingId.value = String(cancellationChoices.value[0].id)
    } catch {
      loadError.value = 'Не удалось обновить список бронирований. Повторите загрузку.'
    }
  } finally {
    isCancelling.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Booking</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-900">Бронирование зала</h2>
      </div>

      <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <label for="rooms-date">Дата</label>
        <CalendarDateInput id="rooms-date" v-model="dateInput" :disabled="isMutating" />
      </div>
    </div>

    <p v-if="!canBook" class="text-sm text-slate-600">Бронирование доступно администраторам и тренерам. Вы можете просматривать залы.</p>
    <p v-else class="text-sm text-slate-600">Отмечены ваши бронирования. Занятость другими пользователями проверяется при подтверждении.</p>

    <div v-if="loadError" class="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
      <p>{{ loadError }}</p>
      <button type="button" class="font-semibold underline disabled:opacity-60" :disabled="loading || isMutating" @click="loadData">Повторить загрузку</button>
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Загружаем комнаты и занятость...
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Залы</h3>

        <div v-if="rooms.length" class="space-y-3">
          <button
            v-for="room in rooms"
            :key="room.id"
            type="button"
            class="w-full rounded-2xl border p-4 text-left transition"
            :class="selectedRoom?.id === room.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
            :disabled="isMutating"
            @click="selectedRoomId = room.id"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold text-slate-900">{{ room.name }}</p>
              <span
                class="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                :class="room.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
              >
                {{ room.active ? 'Активен' : 'Неактивен' }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-600">{{ room.description || 'Без описания' }}</p>
            <div class="mt-3 text-xs text-slate-500">Вместимость: {{ room.capacity }} человек</div>
          </button>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Нет доступных залов.
        </div>
      </aside>

      <div v-if="selectedRoom" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Выбранный зал</p>
            <h3 class="mt-1 text-xl font-semibold text-slate-900">{{ selectedRoom.name }}</h3>
          </div>
          <div class="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
            {{ selectedRoom.capacity }} мест
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="slot in scheduleSlots"
            :key="slot.label"
            type="button"
            :disabled="slot.disabled"
            class="rounded-2xl border px-3 py-3 text-left transition"
            :class="
              slot.isPast
                ? 'border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed'
                : slot.ownBookings.length
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400 disabled:cursor-not-allowed'
                  : slot.disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
            "
            @click="openConfirmation(slot)"
          >
            <div class="text-sm font-semibold">{{ slot.label }}</div>
            <div class="mt-1 text-[11px] uppercase tracking-[0.15em]">
              {{ slot.isPast ? 'Прошло' : slot.isPending ? 'Сохраняем...' : slot.ownBookings.length ? 'Ваша бронь' : slot.occupied ? 'Занято' : !bookingsReady ? 'Нет данных' : slot.hasStarted ? 'Уже началось' : canBook ? 'Выбрать время' : 'Просмотр' }}
            </div>
          </button>
        </div>
      </div>
    </div>

    <BookingDialog v-if="confirmationSlot" title="Подтвердите бронь" :busy="isMutating" @close="confirmationSlot = null">
      <p class="mt-3 text-sm text-slate-600">
        {{ confirmationSlot.roomName }}: {{ formatMoscowDate(confirmationSlot.startsAt, { dateStyle: 'short', timeStyle: 'short' }) }} –
        {{ formatMoscowDate(confirmationSlot.endsAt, { dateStyle: 'short', timeStyle: 'short' }) }}
      </p>
      <template #actions>
        <button type="button" :disabled="isMutating" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60" @click="confirmationSlot = null">Отмена</button>
        <button type="button" :disabled="isMutating" class="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60" @click="confirmBooking">{{ isSubmitting ? 'Сохраняем...' : 'Подтвердить' }}</button>
      </template>
    </BookingDialog>

    <BookingDialog v-if="cancellationBooking" title="Отмена бронирования" :busy="isMutating" @close="closeCancellation">
      <label v-if="cancellationChoices.length > 1" class="mt-3 block text-sm text-slate-700">
        Выберите бронирование
        <select v-model="cancellationBookingId" :disabled="isMutating" class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2">
          <option v-for="booking in cancellationChoices" :key="booking.id" :value="String(booking.id)">
            {{ formatMoscowDate(parseServerDateTime(booking.startsAt), { dateStyle: 'short', timeStyle: 'short' }) }} – {{ formatMoscowDate(parseServerDateTime(booking.endsAt), { timeStyle: 'short' }) }}
          </option>
        </select>
      </label>
      <p class="mt-3 font-medium text-slate-900">{{ cancellationBooking.roomName ?? selectedRoom?.name }}</p>
      <p class="mt-2 text-sm text-slate-600">
        {{ formatMoscowDate(parseServerDateTime(cancellationBooking.startsAt), { dateStyle: 'short', timeStyle: 'short' }) }} –
        {{ formatMoscowDate(parseServerDateTime(cancellationBooking.endsAt), { dateStyle: 'short', timeStyle: 'short' }) }}
      </p>
      <template #actions>
        <button type="button" :disabled="isMutating" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60" @click="closeCancellation">Назад</button>
        <button type="button" :disabled="isMutating || !bookingsReady" class="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60" @click="cancelBooking">{{ isCancelling ? 'Отменяем...' : 'Отменить бронирование' }}</button>
      </template>
    </BookingDialog>
  </section>
</template>
