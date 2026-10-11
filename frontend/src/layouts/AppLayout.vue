<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { routePaths } from '@/router/routes'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const navItems = computed(() => {
  const role = session.currentUser?.role ?? 'USER'
  const items = [
    { label: 'Залы', to: routePaths.rooms, roles: ['USER', 'TRAINER', 'ADMIN'] },
    { label: 'Расписание', to: routePaths.schedule, roles: ['TRAINER', 'ADMIN'] },
    { label: 'Мои брони', to: routePaths.myBookings, roles: ['USER', 'TRAINER', 'ADMIN'] },
    { label: 'Профиль', to: routePaths.profile, roles: ['USER', 'TRAINER', 'ADMIN'] },
    { label: 'Админ', to: routePaths.admin, roles: ['ADMIN'] },
  ]

  return items.filter((item) => item.roles.includes(role))
})

const isActive = (path: string) => route.path === path

async function logout() {
  await session.logout()
  await router.replace(routePaths.login)
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <div class="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
      <aside class="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:block">
        <div class="mb-6">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Studio</p>
          <h1 class="mt-2 text-2xl font-semibold">Dance Booking</h1>
        </div>

        <nav class="space-y-2">
          <button
            v-for="item in navItems"
            :key="item.to"
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition"
            :class="
              isActive(item.to)
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            "
            @click="router.push(item.to)"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="mt-8 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p class="font-medium text-slate-800">{{ session.currentUser?.firstName }} {{ session.currentUser?.lastName }}</p>
          <p class="mt-1">{{ session.currentUser?.role }}</p>
        </div>

        <button
          type="button"
          class="mt-8 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          @click="logout"
        >
          Выйти
        </button>
      </aside>

      <div class="flex-1">
        <header class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Studio</p>
              <h1 class="text-lg font-semibold">Dance Booking</h1>
            </div>
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-2 py-1 text-sm"
              @click="logout"
            >
              Выход
            </button>
          </div>
        </header>

        <main class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <router-view />
        </main>

        <nav class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white md:hidden">
          <div class="grid grid-cols-4 gap-1 p-2 text-center text-[11px]">
            <button
              v-for="item in navItems"
              :key="item.to"
              type="button"
              class="rounded-xl px-2 py-3 font-medium"
              :class="isActive(item.to) ? 'bg-indigo-600 text-white' : 'text-slate-600'"
              @click="router.push(item.to)"
            >
              {{ item.label }}
            </button>
          </div>
        </nav>
      </div>
    </div>
  </div>
</template>
