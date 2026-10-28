import { onMounted, onUnmounted, ref } from 'vue'

export function useCurrentTime() {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | undefined
  const update = () => { now.value = new Date() }

  onMounted(() => {
    update()
    timer = setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
  })

  onUnmounted(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', update)
  })

  return now
}
