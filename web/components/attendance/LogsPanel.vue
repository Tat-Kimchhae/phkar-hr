<script setup lang="ts">
import dayjs from 'dayjs'
import AppSelect from '~/components/app/AppSelect.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import type { AttendanceLog, Employee } from '~/types'

const { t } = useI18n()
const api = useHrApi()
const logs = ref<AttendanceLog[]>([])
const employees = ref<Employee[]>([])
const loading = ref(true)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const employeeId = ref('')
const method = ref('')
const startDate = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const endDate = ref(dayjs().format('YYYY-MM-DD'))
const page = ref(1)
const pageSize = 10

const filteredLogs = computed(() => logs.value.filter((log: AttendanceLog) => {
  const date = log.workDate
  return (!employeeId.value || log.employeeId === employeeId.value)
    && (!method.value || log.method === method.value)
    && (!startDate.value || (Boolean(date) && date >= startDate.value))
    && (!endDate.value || (Boolean(date) && date <= endDate.value))
}))
const pages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / pageSize)))
const visibleLogs = computed(() => filteredLogs.value.slice((page.value - 1) * pageSize, page.value * pageSize))

watch([employeeId, method, startDate, endDate], () => { page.value = 1 })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [logPage, employeePage] = await Promise.all([
      api.attendance.logs.list({ sortBy: 'workDate', sortDirection: 'desc' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
    ])
    logs.value = logPage.items
    employees.value = employeePage.items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function employeeById(id: string): Employee | null {
  return employees.value.find((item: Employee) => item.id === id) ?? null
}

function employeeName(id: string): string {
  const employee = employeeById(id)
  return employee ? `${employee.firstName} ${employee.lastName}` : t('common.notSet')
}

onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-lg font-semibold">{{ t('attendance.logs') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('attendance.logsDescription') }}</p>
    </header>
    <div class="grid gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-4">
      <AppSelect
        v-model="employeeId"
        :options="employees.map((employee: Employee) => ({ label: `${employee.firstName} ${employee.lastName}`, value: employee.id }))"
        :placeholder="t('attendance.allEmployees')"
        clearable
      />
      <AppSelect
        v-model="method"
        :options="[
          { label: t('attendance.methods.gps'), value: 'gps' },
          { label: t('attendance.methods.gpsSimulated'), value: 'gps_simulated' },
          { label: t('attendance.methods.manual'), value: 'manual' },
        ]"
        :placeholder="t('attendance.allMethods')"
        clearable
      />
      <label class="flex items-center gap-2 text-sm"><span>{{ t('attendance.from') }}</span><input v-model="startDate" type="date" class="attendance-control min-w-0"></label>
      <label class="flex items-center gap-2 text-sm"><span>{{ t('attendance.to') }}</span><input v-model="endDate" type="date" class="attendance-control min-w-0"></label>
    </div>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="6" :columns="6" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="visibleLogs.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('attendance.noLogs') }}</div>
    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              <th class="px-5 py-3">{{ t('attendance.employee') }}</th><th class="px-5 py-3">{{ t('attendance.date') }}</th>
              <th class="px-5 py-3">{{ t('attendance.checkIn') }}</th><th class="px-5 py-3">{{ t('attendance.checkOut') }}</th>
              <th class="px-5 py-3">{{ t('attendance.method') }}</th><th class="px-5 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="log in visibleLogs" :key="log.id">
              <td class="whitespace-nowrap px-5 py-3 font-medium">
                <div class="flex items-center gap-3">
                  <AppAvatar :employee="employeeById(log.employeeId)" size="sm" />
                  <span>{{ employeeName(log.employeeId) }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-5 py-3">{{ log.workDate }}</td>
              <td class="whitespace-nowrap px-5 py-3">{{ log.checkIn ? dayjs(log.checkIn).format('HH:mm') : t('common.notSet') }}</td>
              <td class="whitespace-nowrap px-5 py-3">{{ log.checkOut ? dayjs(log.checkOut).format('HH:mm') : t('common.notSet') }}</td>
              <td class="whitespace-nowrap px-5 py-3">{{ log.method }}</td>
              <td class="whitespace-nowrap px-5 py-3"><NuxtLink :to="`/attendance/logs/${log.id}`" class="font-medium text-emerald-700 hover:underline dark:text-emerald-400">{{ t('attendance.viewDetails') }}</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="flex items-center justify-between border-t border-slate-200 p-4 text-sm dark:border-slate-800">
        <span>{{ t('attendance.pageOf', { page, pages }) }}</span>
        <div class="flex gap-2">
          <button class="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50 dark:border-slate-700" :disabled="page <= 1" @click="page--">{{ t('common.previous') }}</button>
          <button class="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50 dark:border-slate-700" :disabled="page >= pages" @click="page++">{{ t('common.next') }}</button>
        </div>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.attendance-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
