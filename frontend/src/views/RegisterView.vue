<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { routePaths } from '@/router/routes'

const router = useRouter()
const session = useSessionStore()

const form = ref({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
})

const errors = ref<{ email?: string; password?: string; firstName?: string; lastName?: string }>({})
const submitting = ref(false)

function validate() {
  const nextErrors: { email?: string; password?: string; firstName?: string; lastName?: string } = {}

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    nextErrors.email = 'Введите корректный email'
  }

  if (form.value.password.length < 6) {
    nextErrors.password = 'Пароль должен содержать минимум 6 символов'
  }

  if (!form.value.firstName.trim()) {
    nextErrors.firstName = 'Имя обязательно'
  }

  if (!form.value.lastName.trim()) {
    nextErrors.lastName = 'Фамилия обязательна'
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
    await session.register({
      email: form.value.email,
      password: form.value.password,
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
    })

    await router.replace(routePaths.rooms)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось зарегистрироваться'
    session.setFlash(message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Create account</p>
      <h1 class="mt-2 text-3xl font-semibold text-slate-900">Регистрация</h1>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Имя</label>
          <input v-model="form.firstName" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.firstName ? 'border-red-400' : ''" />
          <p v-if="errors.firstName" class="mt-1 text-xs text-red-600">{{ errors.firstName }}</p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Фамилия</label>
          <input v-model="form.lastName" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.lastName ? 'border-red-400' : ''" />
          <p v-if="errors.lastName" class="mt-1 text-xs text-red-600">{{ errors.lastName }}</p>
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input v-model="form.email" type="email" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.email ? 'border-red-400' : ''" />
        <p v-if="errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Пароль</label>
        <input v-model="form.password" type="password" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.password ? 'border-red-400' : ''" />
        <p v-if="errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</p>
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Создаём...' : 'Создать аккаунт' }}
      </button>
    </form>

    <div class="mt-5 text-center text-sm text-slate-600">
      Уже есть аккаунт?
      <router-link :to="routePaths.login" class="font-semibold text-indigo-600">Войти</router-link>
    </div>
  </div>
</template>
