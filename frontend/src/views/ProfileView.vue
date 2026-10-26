<script setup lang="ts">
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
</script>

<template>
  <section>
    <h2 class="text-2xl font-semibold">Профиль</h2>
    <div class="mt-4 space-y-2 text-sm text-slate-600">
      <p>Email: {{ session.currentUser?.email }}</p>
      <p>ФИО: {{ session.currentUser?.firstName }} {{ session.currentUser?.lastName }}</p>
      <p>Роль: {{ session.currentUser?.role }}</p>
    </div>
  </section>
</template>
