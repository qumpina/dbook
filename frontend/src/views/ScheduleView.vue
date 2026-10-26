<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { Booking, Room } from '@/types/domain'

const session = useSessionStore()
const rooms = ref<Room[]>([])
const bookings = ref<Booking[]>([])
const selectedDate = ref(new Date())
const loading = ref(false)

const dateInput = computed({
  get: () => formatInputDate(selectedDate.value),
  set: (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) {
      return
    }
    selectedDate.value = new Date(year, month - 1, day)
  },
})

function formatInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const roomRows = computed(() => {
  return rooms.value.map((room) => {
    const dayBookings = bookings.value.filter((booking) => {
      if (booking.roomId !== room.id) {
        return false
      }

      const bookingDate = new Date(booking.startsAt)
      return (
        bookingDate.getFullYear() === selectedDate.value.getFullYear() &&
        bookingDate.getMonth() === selectedDate.value.getMonth() &&
        bookingDate.getDate() === selectedDate.value.getDate()
      )
    })

    return {
      room,
      dayBookings,
    }
  })
})

async function loadData() {
  loading.value = true
  try {
    const [roomsResponse, bookingsResponse] = await Promise.all([
      session.api.getRooms(),
      session.currentUser?.role === 'ADMIN' ? session.api.getAllBookings() : session.api.getMyBookings(),
    ])
    rooms.value = roomsResponse.data
    bookings.value = bookingsResponse.data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить расписание'
    session.setFlash(message)
  } finally {
    loading.value = false
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
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Schedule</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-900">{{ session.currentUser?.role === 'ADMIN' ? 'Расписание залов' : 'Моё расписание' }}</h2>
      </div>

      <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <span>Дата</span>
        <input v-model="dateInput" type="date" class="bg-transparent outline-none" />
      </label>
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Загружаем расписание...
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-3 font-medium">Зал</th>
            <th class="px-4 py-3 font-medium">Брони на дату</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="row in roomRows" :key="row.room.id">
            <td class="px-4 py-4 align-top">
              <div class="font-medium text-slate-900">{{ row.room.name }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ row.room.capacity }} мест</div>
            </td>
            <td class="px-4 py-4">
              <div v-if="row.dayBookings.length" class="flex flex-wrap gap-2">
                <span
                  v-for="booking in row.dayBookings"
                  :key="booking.id"
                  class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                >
                  {{ new Date(booking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }}–{{
                    new Date(booking.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                  }}
                </span>
              </div>
              <div v-else class="text-slate-400">Броней нет</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
