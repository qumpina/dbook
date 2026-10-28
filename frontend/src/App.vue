<script setup lang="ts">
import { computed } from 'vue'
import AppToaster from '@/components/AppToaster.vue'
import { useRoute } from 'vue-router'
import GuestLayout from '@/layouts/GuestLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const isGuestShell = computed(() => {
  return route.meta.guestOnly === true || !session.isAuthenticated
})

</script>

<template>
  <div>
    <AppToaster />

    <div v-if="session.isBootstrapping" class="flex min-h-screen items-center justify-center text-sm font-medium text-slate-600">
      Проверяем сессию...
    </div>

    <GuestLayout v-else-if="isGuestShell" />
    <AppLayout v-else />
  </div>
</template>
