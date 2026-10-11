<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useSessionStore } from '@/stores/session'
import type { Booking } from '@/types/domain'

const session = useSessionStore()
const bookings = ref<Booking[]>([])
const loading = ref(false)

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
  try {
    await session.api.deleteBooking(booking.id)
    await loadBookings()
  } catch (error) {
    const responseStatus = error instanceof Error && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined
    if (responseStatus === 404) {
      await loadBookings()
      return
    }

    const message = error instanceof Error ? error.message : 'Не удалось удалить бронь'
    toast.error(message)
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

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Загружаем список броней...
    </div>

    <div v-else-if="bookings.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
      У вас пока нет бронирований.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="booking in bookings"
        :key="booking.id"
        class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div class="text-lg font-semibold text-slate-900">{{ booking.roomName ?? booking.room?.name ?? 'Зал' }}</div>
          <div class="mt-1 text-sm text-slate-600">
            {{ new Date(booking.startsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) }} –
            {{ new Date(booking.endsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) }}
          </div>
        </div>

        <button
          type="button"
          class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          @click="cancelBooking(booking)"
        >
          Отменить
        </button>
      </div>
    </div>
  </section>
</template>
