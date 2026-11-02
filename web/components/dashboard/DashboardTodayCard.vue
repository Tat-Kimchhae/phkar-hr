<script setup lang="ts">
import AppAvatar from '~/components/app/AppAvatar.vue'
import type { AttendanceDaySummary } from '~/composables/useAttendance'

const props = defineProps<{
  title: string
  checkedIn: number
  eligible: number
  late: AttendanceDaySummary[]
  absent: AttendanceDaySummary[]
  lateLabel: string
  absentLabel: string
  emptyLabel: string
  checkedInSummary: string
  rateLabel: string
}>()
const { locale } = useI18n()
const rate = computed(() => props.eligible ? Math.min(100, Math.round((props.checkedIn / props.eligible) * 100)) : 0)
const formatter = computed(() => new Intl.NumberFormat(locale.value === 'km' ? 'km-KH' : 'en-US'))
function displayName(employee: AttendanceDaySummary['employee']) {
  if (locale.value === 'km' && (employee.firstNameKh || employee.lastNameKh)) {
    return [employee.firstNameKh, employee.lastNameKh].filter(Boolean).join(' ')
  }
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ')
}
</script>

<template>
  <section class="dashboard-card flex h-full min-h-[360px] flex-col p-6">
    <header>
      <h2 class="font-semibold text-slate-900 dark:text-white">{{ props.title }}</h2>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ formatter.format(props.checkedIn) }} / {{ formatter.format(props.eligible) }} {{ props.checkedInSummary }}</p>
    </header>
    <div class="mt-5 flex items-center gap-4">
      <div class="relative grid size-[76px] shrink-0 place-items-center rounded-full" :style="{ background: `conic-gradient(var(--chart-on-time) ${rate}%, var(--dashboard-border) 0)` }">
        <div class="grid size-[60px] place-items-center rounded-full bg-[var(--dashboard-card)]">
          <strong class="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatter.format(rate) }}%</strong>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ formatter.format(rate) }}% {{ props.rateLabel }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ formatter.format(props.checkedIn) }} {{ props.checkedInSummary }}</p>
      </div>
    </div>
    <div class="mt-5 grid min-h-0 flex-1 grid-cols-2 gap-4">
      <div class="min-w-0">
        <h3 class="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{{ props.lateLabel }} <span class="font-normal text-slate-400">({{ formatter.format(props.late.length) }})</span></h3>
        <ul v-if="props.late.length" class="space-y-2">
          <li v-for="item in props.late.slice(0, 3)" :key="item.employee.id" class="flex min-w-0 items-center gap-2">
            <AppAvatar :employee="item.employee" size="xs" />
            <span class="truncate text-xs text-slate-600 dark:text-slate-300">{{ displayName(item.employee) }}</span>
          </li>
        </ul>
        <p v-else class="text-xs text-slate-400">{{ props.emptyLabel }}</p>
      </div>
      <div class="min-w-0">
        <h3 class="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ props.absentLabel }} <span class="font-normal text-slate-400">({{ formatter.format(props.absent.length) }})</span></h3>
        <ul v-if="props.absent.length" class="space-y-2">
          <li v-for="item in props.absent.slice(0, 3)" :key="item.employee.id" class="flex min-w-0 items-center gap-2">
            <AppAvatar :employee="item.employee" size="xs" />
            <span class="truncate text-xs text-slate-600 dark:text-slate-300">{{ displayName(item.employee) }}</span>
          </li>
        </ul>
        <p v-else class="text-xs text-slate-400">{{ props.emptyLabel }}</p>
      </div>
    </div>
  </section>
</template>
