<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import 'vue-sonner/style.css'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const documentHidden = ref(false)
let flashToastId: string | number | undefined

function updateVisibility() {
  documentHidden.value = globalThis.document.hidden
}

let stopFlashWatch: (() => void) | undefined

onMounted(() => {
  updateVisibility()
  globalThis.document.addEventListener('visibilitychange', updateVisibility)
  // The Toaster child subscribes during setup, before this mounted hook runs.
  stopFlashWatch = watch(() => session.flashMessage, (message) => {
    if (flashToastId !== undefined) toast.dismiss(flashToastId)
    flashToastId = undefined
    if (!message) return

    const clearMessage = () => {
      if (flashToastId === id && session.flashMessage === message) session.clearFlash()
    }
    const id = toast.info(message, {
      onDismiss: clearMessage,
      onAutoClose: clearMessage,
    })
    flashToastId = id
  }, { immediate: true })
})

onBeforeUnmount(() => {
  stopFlashWatch?.()
  globalThis.document.removeEventListener('visibilitychange', updateVisibility)
  if (flashToastId !== undefined) toast.dismiss(flashToastId)
})
</script>

<template>
  <Toaster
    :class="documentHidden ? 'app-toaster is-document-hidden' : 'app-toaster'"
    :style="{ '--width': 'min(420px, calc(100vw - 32px))' }"
    position="top-center"
    theme="light"
    rich-colors
    close-button
    close-button-position="top-right"
    :duration="4000"
    :offset="16"
    :mobile-offset="16"
    :toast-options="{ closeButtonAriaLabel: 'Закрыть уведомление' }"
    container-aria-label="Уведомления"
  >
    <template #close-icon><span aria-hidden="true">×</span></template>
  </Toaster>
</template>

<style>
/* Namespace overrides to the shared notification host; Sonner owns stacking/timers. */
.app-toaster[data-sonner-toaster] {
  --width: min(420px, calc(100vw - 32px));
  z-index: 100;
}

/* Keep the same centering algorithm across breakpoints. Sonner otherwise animates
   translateX(-50%) to none after a resize while its left edge already changed. */
.app-toaster[data-sonner-toaster][data-x-position='center'] {
  left: 50%;
  right: auto;
  width: var(--width);
  transform: translateX(-50%);
  transition: none;
}

.app-toaster[data-sonner-toaster] [data-sonner-toast][data-styled='true'] {
  border-radius: 12px;
  padding: 16px 44px 18px 16px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 16%);
  overflow: hidden;
}

.app-toaster [data-title] {
  overflow-wrap: anywhere;
}

.app-toaster [data-sonner-toast][data-styled='true'] [data-close-button] {
  top: 8px;
  right: 8px;
  left: auto;
  bottom: auto;
  transform: none;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 24px;
  line-height: 1;
}

.app-toaster [data-sonner-toast][data-mounted='true']::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: currentColor;
  opacity: 0.65;
  transform-origin: left;
  animation: app-toast-countdown 4s linear forwards;
}

/* These states are also used by Sonner's remaining-time timer. */
.app-toaster [data-sonner-toast][data-expanded='true']::after,
.app-toaster [data-sonner-toast][data-swiping='true']::after,
.app-toaster.is-document-hidden [data-sonner-toast]::after {
  animation-play-state: paused;
}

/* Hide immediately, without waiting for Sonner to remove its DOM node. */
.app-toaster [data-sonner-toast][data-removed='true'] {
  display: none;
}

@keyframes app-toast-countdown {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

@media (max-width: 600px) {
  .app-toaster[data-sonner-toaster] [data-sonner-toast] {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-toaster [data-sonner-toast]::after {
    animation-timing-function: steps(4, end);
  }
}
</style>
