<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { formatMoscowDateTime, hasEnded } from '@/config/schedule'
import { useCurrentTime } from '@/composables/useCurrentTime'
import { useSessionStore } from '@/stores/session'
import { AppError } from '@/types/errors'
import type { Booking } from '@/types/domain'

const session = useSessionStore()
const bookings = ref<Booking[]>([])
const loading = ref(false)
const cancellingId = ref<number | null>(null)
const showPast = ref(false)
const now = useCurrentTime()
const visibleBookings = computed(() => bookings.value.filter((booking) => showPast.value || !hasEnded(booking.endsAt, now.value)))

async function loadBookings() {
  loading.value = true
  try {
    const response = await session.api.getMyBookings()
    bookings.value = response.data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить ваши брони'
    session.setFlash(message)
  } finally {
    loading.value = false
  }
}

async function cancelBooking(booking: Booking) {
  if (cancellingId.value !== null) return
  cancellingId.value = booking.id
  try {
    await session.api.deleteBooking(booking.id)
    await loadBookings()
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      await loadBookings()
      return
    }

    const message = error instanceof Error ? error.message : 'Не удалось удалить бронь'
    toast.error(message)
  } finally {
    cancellingId.value = null
  }
}

onMounted(() => {
  void loadBookings()
})
</script>

<template>
  <section class="space-y-5">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">My bookings</p>
      <h2 class="mt-2 text-2xl font-semibold text-slate-900">Мои брони</h2>
    </div>

    <label class="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <input v-model="showPast" type="checkbox" role="switch" class="h-4 w-4 accent-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" />
      Показывать прошедшие
    </label>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Загружаем список броней...
    </div>

    <div v-else-if="visibleBookings.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
      {{ bookings.length === 0 ? 'У вас пока нет бронирований.' : 'Нет актуальных и будущих бронирований. Включите «Показывать прошедшие», чтобы посмотреть историю.' }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="booking in visibleBookings"
        :key="booking.id"
        class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div class="text-lg font-semibold text-slate-900">{{ booking.roomName ?? booking.room?.name ?? 'Зал' }}</div>
          <div class="mt-1 text-sm text-slate-600">
            {{ formatMoscowDateTime(booking.startsAt) }} –
            {{ formatMoscowDateTime(booking.endsAt) }}
          </div>
        </div>

        <button
          type="button"
          class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          :disabled="cancellingId !== null"
          @click="cancelBooking(booking)"
        >
          {{ cancellingId === booking.id ? 'Отменяем...' : 'Отменить' }}
        </button>
      </div>
    </div>
  </section>
</template>
