<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Toaster } from 'vue-sonner'
import { useRoute } from 'vue-router'
import GuestLayout from '@/layouts/GuestLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const isGuestShell = computed(() => {
  return route.meta.guestOnly === true || !session.isAuthenticated
})

onMounted(() => {
  void session.restoreSession()
})
</script>

<template>
  <div>
    <Toaster position="top-right" rich-colors close-button />

    <div
      v-if="session.flashMessage"
      class="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      {{ session.flashMessage }}
    </div>

    <div v-if="session.isBootstrapping" class="flex min-h-screen items-center justify-center text-sm font-medium text-slate-600">
      Проверяем сессию...
    </div>

    <GuestLayout v-else-if="isGuestShell">
      <router-view />
    </GuestLayout>

    <AppLayout v-else>
      <router-view />
    </AppLayout>
  </div>
</template>
