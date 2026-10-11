<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { routePaths } from '@/router/routes'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const form = ref({ email: '', password: '' })
const errors = ref<{ email?: string; password?: string }>({})
const submitting = ref(false)

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : routePaths.rooms
})

function validate() {
  const nextErrors: { email?: string; password?: string } = {}

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    nextErrors.email = 'Введите корректный email'
  }

  if (form.value.password.length < 6) {
    nextErrors.password = 'Пароль должен содержать минимум 6 символов'
  }

  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

async function onSubmit() {
  if (!validate()) {
    return
  }

  submitting.value = true

  try {
    await session.login({
      email: form.value.email,
      password: form.value.password,
    })

    await router.replace(redirectPath.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка входа'
    session.setFlash(message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Welcome back</p>
      <h1 class="mt-2 text-3xl font-semibold text-slate-900">Вход</h1>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
          :class="errors.email ? 'border-red-400' : ''"
          placeholder="you@example.com"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Пароль</label>
        <input
          v-model="form.password"
          type="password"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
          :class="errors.password ? 'border-red-400' : ''"
          placeholder="••••••••"
        />
        <p v-if="errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</p>
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Входим...' : 'Войти' }}
      </button>
    </form>

    <div class="mt-5 text-center text-sm text-slate-600">
      Нет аккаунта?
      <router-link :to="routePaths.register" class="font-semibold text-indigo-600">Зарегистрироваться</router-link>
    </div>
  </div>
</template>
