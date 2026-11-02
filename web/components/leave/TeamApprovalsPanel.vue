<script setup lang="ts">
import type { Employee, LeaveRequest, LeaveType } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const auth = useAuthStore()
const api = useHrApi()
const requests = ref<LeaveRequest[]>([])
const employees = ref<Employee[]>([])
const types = ref<LeaveType[]>([])
const loading = ref(true)
const savingId = ref('')
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const comments = reactive<Record<string, string>>({})
const rowErrors = reactive<Record<string, string>>({})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [requestPage, employeePage, typePage] = await Promise.all([
      api.leave.requests.list({ filter: { status: 'pending' }, sortBy: 'createdAt' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
      api.leave.types.list(),
    ])
    requests.value = requestPage.items.filter(request => request.employeeId !== auth.user?.employeeId)
    employees.value = employeePage.items
    types.value = typePage.items
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

function typeName(id: string): string {
  return types.value.find((type: LeaveType) => type.id === id)?.name ?? t('common.notSet')
}

async function review(request: LeaveRequest, status: 'approved' | 'rejected') {
  if (savingId.value) return
  rowErrors[request.id] = ''
  if (status === 'rejected' && !comments[request.id]?.trim()) {
    rowErrors[request.id] = t('leave.commentRequired')
    return
  }
  savingId.value = request.id
  error.value = ''
  try {
    if (status === 'approved') await api.leave.approve(request.id, comments[request.id]?.trim())
    else await api.leave.reject(request.id, comments[request.id]?.trim() || '')
    notify.success(t(status === 'approved' ? 'toast.leaveApproved' : 'toast.leaveRejected'), undefined, `leave-review:${request.id}`)
    await load()
  } catch (cause) {
    rowErrors[request.id] = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    savingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-lg font-semibold">{{ t('leave.teamApprovals') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('leave.approvalsHelp') }}</p>
    </header>
    <div v-if="showSkeleton && !error" class="grid gap-4 p-5 lg:grid-cols-2" aria-hidden="true"><SkeletonCard v-for="item in 4" :key="item" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="requests.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('leave.noPendingApprovals') }}</div>
    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="request in requests" :key="request.id" class="space-y-4 p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <AppAvatar :employee="employeeById(request.employeeId)" size="sm" />
              <h3 class="font-semibold">{{ employeeName(request.employeeId) }}</h3>
            </div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ typeName(request.leaveTypeId) }} · {{ request.startDate }} – {{ request.endDate }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ t('leave.daysRequested', { days: request.days }) }}<span v-if="request.halfDayPeriod"> · {{ t(`leave.${request.halfDayPeriod}`) }}</span></p>
            <p v-if="request.reason" class="mt-2 text-sm">{{ request.reason }}</p>
            <span v-if="request.attachmentPath" class="mt-2 block text-sm text-slate-500">{{ t('leave.attachment') }}: {{ request.attachmentPath }}</span>
          </div>
          <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{{ t('leave.statuses.pending') }}</span>
        </div>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.approvalComment') }}</span>
          <textarea v-model="comments[request.id]" rows="2" class="control" />
        </label>
        <p v-if="rowErrors[request.id]" role="alert" class="text-sm text-red-600">{{ rowErrors[request.id] }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" :disabled="Boolean(savingId)" class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400" @click="review(request, 'rejected')">{{ t('leave.reject') }}</button>
          <button type="button" :disabled="Boolean(savingId)" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="review(request, 'approved')">{{ savingId === request.id ? t('common.saving') : t('leave.approve') }}</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
