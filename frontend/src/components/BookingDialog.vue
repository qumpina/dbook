<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps<{ title: string; busy?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const titleId = useId()
const dialog = ref<globalThis.HTMLElement | null>(null)
let previousFocus: globalThis.HTMLElement | null = null
let previousOverflow = ''

function close() {
  if (!props.busy) emit('close')
}

function handleKeydown(event: globalThis.KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
  if (event.key !== 'Tab') return
  const elements = dialog.value?.querySelectorAll<globalThis.HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]')
  if (!elements?.length) {
    event.preventDefault()
    return
  }
  const first = elements[0]!
  const last = elements[elements.length - 1]!
  if (event.shiftKey && (globalThis.document.activeElement === first || globalThis.document.activeElement === dialog.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (globalThis.document.activeElement === last || globalThis.document.activeElement === dialog.value)) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previousFocus = globalThis.document.activeElement as globalThis.HTMLElement | null
  previousOverflow = globalThis.document.body.style.overflow
  globalThis.document.body.style.overflow = 'hidden'
  dialog.value?.focus()
})
onBeforeUnmount(() => {
  globalThis.document.body.style.overflow = previousOverflow
  if (previousFocus?.isConnected) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" @click.self="close">
      <section
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-busy="busy"
        tabindex="-1"
        class="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
        @keydown="handleKeydown"
      >
        <h3 :id="titleId" class="text-xl font-semibold text-slate-900">{{ title }}</h3>
        <slot />
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <slot name="actions" />
        </div>
      </section>
    </div>
  </Teleport>
</template>
