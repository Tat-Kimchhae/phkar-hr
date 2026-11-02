<script setup lang="ts">
import { useId } from 'vue'
import AppCountUp from '~/components/app/AppCountUp.vue'

const props = defineProps<{
  label: string
  value: number
  previous: number
  series: number[]
  accent: 'blue' | 'green' | 'amber' | 'violet' | 'rose'
  icon: 'users' | 'check' | 'clock' | 'leave' | 'inbox'
  to: string
}>()
const { locale } = useI18n()
const gradientId = `dashboard-spark-${useId().replace(/:/g, '')}`
const icons = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16 0h4v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  leave: 'M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Zm4 8 2 2 4-4',
  inbox: 'M4 4h16v16H4zM4 13h4l2 3h4l2-3h4',
}
const accentClasses = {
  blue: { tile: 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300', stroke: 'var(--dashboard-accent-blue)' },
  green: { tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300', stroke: 'var(--dashboard-accent-green)' },
  amber: { tile: 'bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300', stroke: 'var(--dashboard-accent-amber)' },
  violet: { tile: 'bg-violet-50 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300', stroke: 'var(--dashboard-accent-violet)' },
  rose: { tile: 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300', stroke: 'var(--dashboard-accent-rose)' },
}
const delta = computed(() => props.value - props.previous)
const trend = computed<'flat' | 'bad' | 'good'>(() => delta.value === 0
  ? 'flat'
  : (props.accent === 'amber' || props.accent === 'rose')
      ? delta.value > 0 ? 'bad' : 'good'
      : delta.value > 0 ? 'good' : 'bad')
const deltaColor = computed(() => {
  const classes: Record<typeof trend.value, string> = {
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    bad: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
    flat: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }
  return classes[trend.value]
})
const sparkline = computed(() => {
  const values = props.series.length ? props.series : [props.value]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 60 : (index / (values.length - 1)) * 120,
    y: 29 - ((value - min) / span) * 22,
  }))
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')
  return { line, area: `${line} L120,34 L0,34 Z` }
})
const numberFormat = computed(() => new Intl.NumberFormat(locale.value === 'km' ? 'km-KH' : 'en-US'))
const deltaText = computed(() => {
  if (delta.value === 0) return locale.value === 'km' ? 'មិនប្រែប្រួល' : 'No change'
  const amount = numberFormat.value.format(Math.abs(delta.value))
  const direction = delta.value > 0 ? '+' : '−'
  const suffix = locale.value === 'km' ? 'ធៀបនឹងមុន' : 'vs previous'
  return `${direction}${amount} ${suffix}`
})
</script>

<template>
  <NuxtLink :to="props.to" class="dashboard-card dashboard-card-hover group flex min-h-[178px] min-w-0 flex-col p-5">
    <div class="flex items-start justify-between gap-3">
      <div :class="['grid size-11 shrink-0 place-items-center rounded-xl', accentClasses[props.accent].tile]">
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="icons[props.icon]" />
        </svg>
      </div>
      <span class="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium tabular-nums" :class="deltaColor">
        <svg v-if="trend !== 'flat'" viewBox="0 0 16 16" class="size-3 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="trend === 'good' ? 'M8 13V3m-4 4 4-4 4 4' : 'M8 3v10m-4-4 4 4 4-4'" />
        </svg>
        <span>{{ deltaText }}</span>
      </span>
    </div>
    <p class="mt-4 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{{ props.label }}</p>
    <div class="mt-1 flex min-w-0 items-end justify-between gap-3">
      <p class="text-3xl font-semibold leading-none tabular-nums tracking-tight text-slate-900 dark:text-white">
        <AppCountUp :key="props.value" :value="props.value" />
      </p>
      <svg viewBox="0 0 120 36" class="h-9 w-24 shrink-0 overflow-visible" role="img" :aria-label="props.label">
        <defs>
          <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" :stop-color="accentClasses[props.accent].stroke" stop-opacity=".24" />
            <stop offset="100%" :stop-color="accentClasses[props.accent].stroke" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="sparkline.area" :fill="`url(#${gradientId})`" />
        <path :d="sparkline.line" fill="none" :stroke="accentClasses[props.accent].stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </NuxtLink>
</template>
