<script setup lang="ts">
import dayjs from 'dayjs'
import { useDelayedPending } from '~/composables/useDelayedPending'
import type { AttendanceDaySummary } from '~/composables/useAttendance'

const { t } = useI18n()
const api = useHrApi()
const rows = ref<AttendanceDaySummary[]>([])
const loading = ref(true)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const today = dayjs().format('YYYY-MM-DD')
    const result = await api.attendance.summary.list({ filters: { date: today } })
    rows.value = result.items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

const statusClasses: Record<string, string> = {
  on_time: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  absent: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  on_leave: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  not_scheduled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-lg font-semibold">{{ t('attendance.todayBoard') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ dayjs().format('dddd, D MMMM YYYY') }}</p>
    </header>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="6" :columns="4" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="rows.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('attendance.noEmployees') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr>
            <th class="px-5 py-3">{{ t('attendance.employee') }}</th>
            <th class="px-5 py-3">{{ t('attendance.checkIn') }}</th>
            <th class="px-5 py-3">{{ t('attendance.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="row in rows" :key="row.employee.id">
            <td class="whitespace-nowrap px-5 py-3 font-medium">
              <div class="flex items-center gap-3">
                <AppAvatar :employee="row.employee" size="sm" />
                <span>{{ row.employee.firstName }} {{ row.employee.lastName }} <span class="text-xs font-normal text-slate-500">({{ row.employee.employeeNo }})</span></span>
              </div>
            </td>
            <td class="whitespace-nowrap px-5 py-3">{{ row.checkIn ? dayjs(row.checkIn).format('HH:mm') : t('common.notSet') }}</td>
            <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClasses[row.status]">{{ t(`attendance.statuses.${row.status}`) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
