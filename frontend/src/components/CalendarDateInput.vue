<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ id: string; modelValue: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const displayDate = computed(() => {
  const parts = props.modelValue.split('-')
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]!.slice(-2)}` : 'ДД.ММ.ГГ'
})

function showPicker(event: globalThis.MouseEvent) {
  const input = event.currentTarget as globalThis.HTMLInputElement
  try {
    input.showPicker?.()
  } catch {
    // Browsers without programmatic picker support retain their native date control.
  }
}
</script>

<template>
  <div class="relative rounded-md px-1 focus-within:ring-2 focus-within:ring-indigo-400" :class="disabled ? 'opacity-60' : ''">
    <span data-testid="rooms-date-display" aria-hidden="true" class="inline-flex items-center gap-2 tabular-nums">
      {{ displayDate }}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    </span>
    <input
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      type="date"
      lang="ru"
      class="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      @input="emit('update:modelValue', ($event.target as globalThis.HTMLInputElement).value)"
      @click="showPicker"
    />
  </div>
</template>
