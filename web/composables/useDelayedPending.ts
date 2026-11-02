import type { Ref } from 'vue'

/** Delays skeletons to avoid flicker and keeps a revealed skeleton visible briefly. */
export function useDelayedPending(pending: Readonly<Ref<boolean>>, delay = 150, minimum = 300) {
  const showSkeleton = ref(false)
  let revealTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let shownAt = 0

  watch(pending, (isPending: boolean) => {
    clearTimeout(revealTimer)
    clearTimeout(hideTimer)

    if (isPending) {
      if (!showSkeleton.value) {
        revealTimer = setTimeout(() => {
          showSkeleton.value = true
          shownAt = Date.now()
        }, delay)
      }
      return
    }

    if (!showSkeleton.value) return
    hideTimer = setTimeout(() => {
      showSkeleton.value = false
    }, Math.max(0, minimum - (Date.now() - shownAt)))
  }, { immediate: true })

  onBeforeUnmount(() => {
    clearTimeout(revealTimer)
    clearTimeout(hideTimer)
  })

  return showSkeleton
}
