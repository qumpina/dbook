<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const roleLabel = computed(() => session.currentUser?.role ?? 'GUEST')

onMounted(() => {
  void session.restoreSession()
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <section
      v-if="session.isBootstrapping"
      class="flex min-h-screen items-center justify-center text-sm font-medium"
    >
      Проверяем сессию...
    </section>

    <section v-else class="mx-auto max-w-3xl p-8">
      <h1 class="text-2xl font-semibold">Dance Studio Booking</h1>
      <p class="mt-4 text-slate-700">
        Текущая роль:
        <span class="font-semibold">{{ roleLabel }}</span>
      </p>
      <p class="mt-2 text-slate-700">
        Пользователь:
        <span class="font-semibold">{{ session.currentUser?.email ?? 'не авторизован' }}</span>
      </p>
    </section>
  </main>
</template>
