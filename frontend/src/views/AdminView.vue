<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatMoscowDateTime } from '@/config/schedule'
import { useSessionStore } from '@/stores/session'
import type { Booking, Room } from '@/types/domain'

const session = useSessionStore()
const rooms = ref<Room[]>([])
const bookings = ref<Booking[]>([])
const loading = ref(false)
const creating = ref(false)
const createError = ref('')
const newRoom = ref({ name: '', description: '', capacity: 1, active: true })

async function createRoom() {
  if (creating.value) return
  creating.value = true
  createError.value = ''
  try {
    await session.api.createRoom({
      ...newRoom.value,
      name: newRoom.value.name.trim(),
      description: newRoom.value.description.trim(),
    })
    newRoom.value = { name: '', description: '', capacity: 1, active: true }
    await loadData()
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Не удалось создать зал'
  } finally {
    creating.value = false
  }
}

const summary = computed(() => ({
  rooms: rooms.value.length,
  bookings: bookings.value.length,
}))

async function loadData() {
  loading.value = true
  try {
    const [roomsResponse, bookingsResponse] = await Promise.all([
      session.api.getRooms(),
      session.api.getAllBookings(),
    ])
    rooms.value = roomsResponse.data
    bookings.value = bookingsResponse.data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить админ-данные'
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
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Admin</p>
      <h2 class="mt-2 text-2xl font-semibold text-slate-900">Админ-панель</h2>
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Загружаем статистику и бронирования...
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="text-sm text-slate-500">Активных залов</div>
        <div class="mt-2 text-3xl font-semibold text-slate-900">{{ summary.rooms }}</div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="text-sm text-slate-500">Всего броней</div>
        <div class="mt-2 text-3xl font-semibold text-slate-900">{{ summary.bookings }}</div>
      </div>
    </div>

    <form class="space-y-3 rounded-2xl border border-slate-200 p-4" :aria-busy="creating" @submit.prevent="createRoom">
      <h3 class="font-semibold">Добавить зал</h3>
      <p v-if="createError" role="alert" class="text-sm text-red-700">{{ createError }}</p>
      <label class="block text-sm">Название
        <input v-model="newRoom.name" name="roomName" required maxlength="100" class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label class="block text-sm">Описание
        <textarea v-model="newRoom.description" name="description" required maxlength="1000" class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label class="block text-sm">Вместимость
        <input v-model.number="newRoom.capacity" name="capacity" type="number" required min="1" step="1" class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label class="flex items-center gap-2 text-sm"><input v-model="newRoom.active" type="checkbox" />Активный зал</label>
      <button type="submit" :disabled="creating" class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{{ creating ? 'Создаём...' : 'Создать зал' }}</button>
    </form>

    <div class="overflow-auto rounded-2xl border border-slate-200 bg-white">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-3 font-medium">Зал</th>
            <th class="px-4 py-3 font-medium">Пользователь</th>
            <th class="px-4 py-3 font-medium">Время</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="booking in bookings" :key="booking.id">
            <td class="px-4 py-3">{{ booking.roomName ?? booking.room?.name ?? '—' }}</td>
            <td class="px-4 py-3">{{ booking.userEmail ?? booking.user?.email ?? '—' }}</td>
            <td class="px-4 py-3">
              {{ formatMoscowDateTime(booking.startsAt) }} –
              {{ formatMoscowDateTime(booking.endsAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
