<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { routePaths, getAuthRedirect } from '@/router/routes'
import { passwordError } from '@/utils/password'
import { AppError } from '@/types/errors'

const router = useRouter()
const route = useRoute()
const redirectPath = computed(() => getAuthRedirect(route.query.redirect))
const session = useSessionStore()

const form = ref({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
})

const errors = ref<{ email?: string; password?: string; firstName?: string; lastName?: string }>({})
const submitting = ref(false)
const submitError = ref('')

function validate() {
  const nextErrors: { email?: string; password?: string; firstName?: string; lastName?: string } = {}

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    nextErrors.email = 'Введите корректный email'
  }

  nextErrors.password = passwordError(form.value.password)

  if (!form.value.firstName.trim() || form.value.firstName.trim().length > 100) {
    nextErrors.firstName = 'Введите имя длиной до 100 символов'
  }

  if (!form.value.lastName.trim() || form.value.lastName.trim().length > 100) {
    nextErrors.lastName = 'Введите фамилию длиной до 100 символов'
  }

  errors.value = nextErrors
  return !Object.values(nextErrors).some(Boolean)
}

async function onSubmit() {
  if (submitting.value) return
  submitError.value = ''
  session.clearFlash()
  form.value.email = form.value.email.trim()
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

    await router.replace(redirectPath.value)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось зарегистрироваться'
    submitError.value = message
    if (error instanceof AppError) errors.value = error.fieldErrors
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

    <form class="space-y-4" novalidate :aria-busy="submitting" @submit.prevent="onSubmit">
      <p v-if="submitError" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ submitError }}</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="firstName" class="mb-1 block text-sm font-medium text-slate-700">Имя</label>
          <input id="firstName" v-model="form.firstName" name="firstName" autocomplete="given-name" :aria-invalid="Boolean(errors.firstName)" :aria-describedby="errors.firstName ? 'firstName-error' : undefined" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.firstName ? 'border-red-400' : ''" />
          <p v-if="errors.firstName" id="firstName-error" class="mt-1 text-xs text-red-600">{{ errors.firstName }}</p>
        </div>

        <div>
          <label for="lastName" class="mb-1 block text-sm font-medium text-slate-700">Фамилия</label>
          <input id="lastName" v-model="form.lastName" name="lastName" autocomplete="family-name" :aria-invalid="Boolean(errors.lastName)" :aria-describedby="errors.lastName ? 'lastName-error' : undefined" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.lastName ? 'border-red-400' : ''" />
          <p v-if="errors.lastName" id="lastName-error" class="mt-1 text-xs text-red-600">{{ errors.lastName }}</p>
        </div>
      </div>

      <div>
        <label for="email" class="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input id="email" v-model="form.email" name="email" autocomplete="email" :aria-invalid="Boolean(errors.email)" :aria-describedby="errors.email ? 'email-error' : undefined" type="email" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.email ? 'border-red-400' : ''" />
        <p v-if="errors.email" id="email-error" class="mt-1 text-xs text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label for="password" class="mb-1 block text-sm font-medium text-slate-700">Пароль</label>
        <input id="password" v-model="form.password" name="password" autocomplete="new-password" :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'password-error' : undefined" type="password" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" :class="errors.password ? 'border-red-400' : ''" />
        <p v-if="errors.password" id="password-error" class="mt-1 text-xs text-red-600">{{ errors.password }}</p>
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
      <router-link :to="{ path: routePaths.login, query: { redirect: redirectPath } }" class="font-semibold text-indigo-600">Войти</router-link>
    </div>
  </div>
</template>
