<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number; duration?: number }>(), { duration: 600 })
const { locale } = useI18n()
const displayed = ref(0)
let frame = 0

onMounted(() => {
  const target = props.value
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) {
    displayed.value = target
    return
  }
  const startedAt = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / Math.min(props.duration, 600))
    displayed.value = Math.round(target * (1 - (1 - progress) ** 3))
    if (progress < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>{{ new Intl.NumberFormat(locale === 'km' ? 'km-KH' : 'en-US').format(displayed) }}</template>
