<script setup lang="ts">
import dayjs from 'dayjs'
import type { AttendanceMonthSummary } from '~/composables/useAttendance'
import { useDelayedPending } from '~/composables/useDelayedPending'

const { t } = useI18n()
const api = useHrApi()
const month = ref(dayjs().format('YYYY-MM'))
const rows = ref<AttendanceMonthSummary[]>([])
const loading = ref(true)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.attendance.monthlySummary.list({ filters: { month: month.value } })
    rows.value = result.items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
      <div><h2 class="text-lg font-semibold">{{ t('attendance.monthlySummary') }}</h2><p class="mt-1 text-sm text-slate-500">{{ t('attendance.summaryDescription') }}</p></div>
      <input v-model="month" type="month" class="attendance-control w-auto">
    </header>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="6" :columns="6" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="rows.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('attendance.noEmployees') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr><th class="px-5 py-3">{{ t('attendance.employee') }}</th><th class="px-5 py-3">{{ t('attendance.statuses.on_time') }}</th><th class="px-5 py-3">{{ t('attendance.statuses.late') }}</th><th class="px-5 py-3">{{ t('attendance.statuses.absent') }}</th><th class="px-5 py-3">{{ t('attendance.statuses.on_leave') }}</th><th class="px-5 py-3">{{ t('attendance.workedHours') }}</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="row in rows" :key="row.employee.id">
            <td class="whitespace-nowrap px-5 py-3 font-medium">{{ row.employee.firstName }} {{ row.employee.lastName }} <span class="text-xs font-normal text-slate-500">({{ row.employee.employeeNo }})</span></td>
            <td class="px-5 py-3">{{ row.onTime }}</td><td class="px-5 py-3">{{ row.late }}</td><td class="px-5 py-3">{{ row.absent }}</td><td class="px-5 py-3">{{ row.onLeave }}</td><td class="px-5 py-3">{{ row.workedHours.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.attendance-control {
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
