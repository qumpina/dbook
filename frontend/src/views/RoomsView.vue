<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useSessionStore } from '@/stores/session'
import type { Booking, Room } from '@/types/domain'
import { createScheduleSlots, hasOverlap, toServerLocalDateTime, parseServerDateTime, formatMoscowDate, moscowDateInput } from '@/config/schedule'

const session = useSessionStore()
const canBook = computed(() => ['ADMIN', 'TRAINER'].includes(session.currentUser?.role ?? ''))
const rooms = ref<Room[]>([])
const bookings = ref<Booking[]>([])
const selectedRoomId = ref<number | null>(null)
const dateInput = ref(moscowDateInput())
const loading = ref(false)
const isSubmitting = ref(false)
const pendingSlotKey = ref<string | null>(null)
const confirmationSlot = ref<{ startsAt: Date; endsAt: Date } | null>(null)

const selectedRoom = computed(() => {
  return rooms.value.find((room) => room.id === selectedRoomId.value) ?? rooms.value[0] ?? null
})

const scheduleSlots = computed(() => {
  if (!selectedRoom.value) {
    return []
  }

  const now = new Date()
  const roomId = selectedRoom.value.id

  return createScheduleSlots(dateInput.value).map((slot) => {
    const slotStart = new Date(slot.startsAt)
    const slotEnd = new Date(slot.endsAt)
    const slotKey = `${toServerLocalDateTime(slotStart)}|${toServerLocalDateTime(slotEnd)}`

    const occupied = bookings.value.some((booking) => {
      if (booking.roomId !== roomId) {
        return false
      }

      const bookingStart = parseServerDateTime(booking.startsAt)
      const bookingEnd = parseServerDateTime(booking.endsAt)
      return hasOverlap(slotStart, slotEnd, bookingStart, bookingEnd)
    })

    const isPast = slotStart.getTime() <= now.getTime()
    const isPending = pendingSlotKey.value === slotKey

    return {
      ...slot,
      occupied: occupied || isPending,
      isPast,
      isPending,
      slotKey,
    }
  })
})

async function loadBookings() {
  const response = await session.api.getMyBookings()
  bookings.value = response.data
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
  try {
    await Promise.all([loadRooms(), loadBookings()])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить данные зала'
    session.setFlash(message)
  } finally {
    loading.value = false
  }
}

function openConfirmation(slot: { startsAt: Date; endsAt: Date }) {
  if (!canBook.value || !selectedRoom.value || isSubmitting.value) {
    return
  }

  confirmationSlot.value = slot
}

async function confirmBooking() {
  if (!confirmationSlot.value || !selectedRoom.value) {
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
    roomId: selectedRoom.value.id,
    roomName: selectedRoom.value.name,
    userEmail: session.currentUser?.email ?? '',
    startsAt,
    endsAt,
    createdAt: new Date().toISOString(),
  }

  bookings.value = [...bookings.value, optimisticBooking]

  try {
    const { data } = await session.api.createBooking({
      roomId: selectedRoom.value.id,
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
      await loadBookings().catch(() => session.setFlash('Не удалось обновить список бронирований. Обновите страницу.'))
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

      <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <span>Дата</span>
        <input v-model="dateInput" type="date" class="bg-transparent outline-none" />
      </label>
    </div>

    <p v-if="!canBook" class="text-sm text-slate-600">Бронирование доступно администраторам и тренерам. Вы можете просматривать залы.</p>
    <p v-else class="text-sm text-slate-600">Отмечены ваши бронирования. Занятость другими пользователями проверяется при подтверждении.</p>

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
            :disabled="!canBook || slot.isPast || slot.occupied || isSubmitting"
            class="rounded-2xl border px-3 py-3 text-left transition"
            :class="
              slot.isPast
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : slot.occupied
                  ? 'cursor-not-allowed border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
            "
            @click="openConfirmation(slot)"
          >
            <div class="text-sm font-semibold">{{ slot.label }}</div>
            <div class="mt-1 text-[11px] uppercase tracking-[0.15em]">
              {{ slot.isPast ? 'Прошло' : slot.occupied ? 'Ваша бронь' : 'Выбрать время' }}
            </div>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="confirmationSlot"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      @click.self="confirmationSlot = null"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 class="text-xl font-semibold text-slate-900">Подтвердите бронь</h3>
        <p class="mt-3 text-sm text-slate-600">
          {{ selectedRoom?.name }}: {{ formatMoscowDate(confirmationSlot.startsAt, { dateStyle: 'short', timeStyle: 'short' }) }} –
          {{ formatMoscowDate(confirmationSlot.endsAt, { dateStyle: 'short', timeStyle: 'short' }) }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            @click="confirmationSlot = null"
          >
            Отмена
          </button>
          <button
            type="button"
            class="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting"
            @click="confirmBooking()"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
