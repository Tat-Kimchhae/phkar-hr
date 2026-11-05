<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)
const props = withDefaults(defineProps<{
  data: ChartData<'doughnut', number[], string>
  options: ChartOptions<'doughnut'>
  total: number
  centerLabel: string
  locale: string
}>(), { locale: 'en-US' })
const chartContainer = ref<HTMLElement | null>(null)
const { locale: appLocale } = useI18n()
const hiddenItems = ref<boolean[]>([])
const visibleData = computed<ChartData<'doughnut', number[], string>>(() => ({
  ...props.data,
  datasets: props.data.datasets.map(dataset => ({
    ...dataset,
    data: dataset.data.map((value, index) => hiddenItems.value[index] ? 0 : Number(value)),
  })),
}))
const items = computed(() => {
  const dataset = props.data.datasets[0]
  return (props.data.labels ?? []).map((label, index) => {
    const rawColors = dataset?.backgroundColor
    const color = Array.isArray(rawColors) ? rawColors[index] : rawColors
    const value = Number(dataset?.data[index] ?? 0)
    return {
      label,
      value,
      color: typeof color === 'string' ? color : '#64748b',
      percent: props.total ? Math.round((value / props.total) * 100) : 0,
    }
  })
})

watchEffect(() => {
  const canvas = chartContainer.value?.querySelector('canvas')
  if (!canvas) return
  canvas.dataset.centerLabel = props.centerLabel
  canvas.dataset.centerLocale = props.locale
  canvas.dataset.centerTotal = String(props.total)
})
function toggleItem(index: number) {
  hiddenItems.value = hiddenItems.value.map((hidden, item) => item === index ? !hidden : hidden)
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-center">
    <div ref="chartContainer" class="mx-auto h-48 w-full max-w-[220px]">
      <Doughnut :data="visibleData" :options="options" />
    </div>
    <ul class="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      <li v-for="(item, index) in items" :key="item.label" class="min-w-0">
        <button type="button" class="flex w-full min-w-0 items-center gap-2 text-left text-xs" :class="{ 'opacity-40': hiddenItems[index] }" :aria-pressed="!hiddenItems[index]" @click="toggleItem(index)">
        <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />
        <span class="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{{ item.label }}</span>
        <span class="shrink-0 tabular-nums text-slate-700 dark:text-slate-200">{{ new Intl.NumberFormat(appLocale === 'km' ? 'km-KH' : 'en-US').format(item.value) }}</span>
        <span class="w-9 shrink-0 text-right tabular-nums text-slate-400">{{ item.percent }}%</span>
        </button>
      </li>
    </ul>
  </div>
</template>
