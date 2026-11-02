<script setup lang="ts">
import type { AttendanceCorrection, Employee, OvertimeRecord } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const auth = useAuthStore()
const api = useHrApi()
const section = ref<'corrections' | 'overtime'>('corrections')
const corrections = ref<AttendanceCorrection[]>([])
const overtime = ref<OvertimeRecord[]>([])
const employees = ref<Employee[]>([])
const loading = ref(true)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const savingId = ref('')
const rowErrors = reactive<Record<string, string>>({})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [correctionPage, overtimePage, employeePage] = await Promise.all([
      api.attendance.corrections.list({ filter: { status: 'pending' }, sortBy: 'createdAt', sortDirection: 'desc' }),
      api.attendance.overtime.list({ filter: { status: 'pending' }, sortBy: 'workDate', sortDirection: 'desc' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
    ])
    corrections.value = correctionPage.items.filter(item => item.employeeId !== auth.user?.employeeId)
    overtime.value = overtimePage.items.filter(item => item.employeeId !== auth.user?.employeeId)
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
  return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNo})` : t('common.notSet')
}

async function review(id: string, type: 'corrections' | 'overtime', status: 'approved' | 'rejected') {
  if (savingId.value) return
  rowErrors[id] = ''
  savingId.value = id
  try {
    if (type === 'corrections') {
      if (status === 'approved') await api.attendance.approveCorrection(id)
      else await api.attendance.rejectCorrection(id, '')
    } else if (status === 'approved') {
      await api.attendance.approveOvertime(id)
    } else {
      await api.attendance.rejectOvertime(id, '')
    }
    const messageKey = type === 'corrections'
      ? status === 'approved' ? 'toast.correctionApproved' : 'toast.correctionRejected'
      : status === 'approved' ? 'toast.overtimeApproved' : 'toast.overtimeRejected'
    notify.success(t(messageKey), undefined, `attendance-review:${type}:${id}`)
    await load()
  } catch (cause) {
    rowErrors[id] = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    savingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-lg font-semibold">{{ t('attendance.reviewInbox') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('attendance.reviewDescription') }}</p>
      <nav class="mt-4 flex gap-2" :aria-label="t('attendance.reviewInbox')">
        <button v-for="tab in ['corrections', 'overtime'] as const" :key="tab" class="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700" :class="section === tab ? '!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''" @click="section = tab">{{ t(`attendance.${tab}`) }}</button>
      </nav>
    </header>
    <div v-if="showSkeleton && !error" class="grid gap-4 p-5 lg:grid-cols-2" aria-hidden="true"><SkeletonCard v-for="item in 4" :key="item" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="section === 'corrections' && corrections.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('attendance.noPendingCorrections') }}</div>
    <div v-else-if="section === 'overtime' && overtime.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('attendance.noPendingOvertime') }}</div>
    <ul v-else-if="section === 'corrections'" class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="item in corrections" :key="item.id" class="space-y-4 p-5">
        <div>
          <div class="flex items-center gap-3">
            <AppAvatar :employee="employeeById(item.employeeId)" size="sm" />
            <h3 class="font-semibold">{{ employeeName(item.employeeId) }}</h3>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ t('attendance.correctionReason') }}: {{ item.reason }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ item.requestedCheckIn || t('common.notSet') }} · {{ item.requestedCheckOut || t('common.notSet') }}</p>
        </div>
        <p v-if="rowErrors[item.id]" role="alert" class="text-sm text-red-600">{{ rowErrors[item.id] }}</p>
        <div class="flex justify-end gap-2">
          <button :disabled="Boolean(savingId)" class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400" @click="review(item.id, 'corrections', 'rejected')">{{ t('attendance.reject') }}</button>
          <button :disabled="Boolean(savingId)" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="review(item.id, 'corrections', 'approved')">{{ t('attendance.approveCorrection') }}</button>
        </div>
      </li>
    </ul>
    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="item in overtime" :key="item.id" class="space-y-4 p-5">
        <div>
          <div class="flex items-center gap-3">
            <AppAvatar :employee="employeeById(item.employeeId)" size="sm" />
            <h3 class="font-semibold">{{ employeeName(item.employeeId) }} · {{ item.workDate }}</h3>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ t('attendance.hoursCount', { hours: item.hours }) }}</p>
        </div>
        <p v-if="rowErrors[item.id]" role="alert" class="text-sm text-red-600">{{ rowErrors[item.id] }}</p>
        <div class="flex justify-end gap-2">
          <button :disabled="Boolean(savingId)" class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400" @click="review(item.id, 'overtime', 'rejected')">{{ t('attendance.reject') }}</button>
          <button :disabled="Boolean(savingId)" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="review(item.id, 'overtime', 'approved')">{{ t('attendance.approveOvertime') }}</button>
        </div>
      </li>
    </ul>
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
