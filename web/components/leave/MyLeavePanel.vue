<script setup lang="ts">
import { z } from 'zod'
import dayjs from 'dayjs'
import AppSelect from '~/components/app/AppSelect.vue'
import type { LeaveBalance, LeaveRequest, LeaveType } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const auth = useAuthStore()
const api = useHrApi()
const types = ref<LeaveType[]>([])
const balances = ref<Array<LeaveBalance & { pendingDays: number; remaining: number }>>([])
const requests = ref<LeaveRequest[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const formError = ref('')
const selectedFile = ref<File | null>(null)
const currentYear = dayjs().year()
const form = reactive({
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  duration: 'full' as 'full' | 'morning' | 'afternoon',
  reason: '',
})

const selectedType = computed(() => types.value.find((type: LeaveType) => type.id === form.leaveTypeId) ?? null)
const userRequests = computed(() => requests.value.filter((request: LeaveRequest) => request.employeeId === auth.user?.employeeId))
const requestDays = computed(() => {
  if (form.duration !== 'full') return 0.5
  if (!form.startDate || !form.endDate) return 0
  const days = dayjs(form.endDate).diff(dayjs(form.startDate), 'day') + 1
  return Math.max(days, 0)
})

function remaining(balance: LeaveBalance & { remaining: number }): number {
  return balance.remaining
}

function balanceFor(typeId: string): (LeaveBalance & { pendingDays: number; remaining: number }) | undefined {
  return balances.value.find((balance: LeaveBalance) => balance.leaveTypeId === typeId && balance.year === currentYear)
}

function typeName(id: string): string {
  return types.value.find((type: LeaveType) => type.id === id)?.name ?? t('common.notSet')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [typePage, balancePage, requestPage] = await Promise.all([
      api.leave.types.list({ sortBy: 'name' }),
      api.leave.balanceSummaries.list({ filters: { year: currentYear, employeeId: auth.user?.employeeId ?? '' } }),
      api.leave.requests.list({ sortBy: 'createdAt', sortDirection: 'desc' }),
    ])
    types.value = typePage.items
    balances.value = balancePage.items
    requests.value = requestPage.items
    if (!types.value.some((type: LeaveType) => type.id === form.leaveTypeId)) form.leaveTypeId = types.value[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target
  selectedFile.value = input instanceof HTMLInputElement ? input.files?.[0] ?? null : null
}

async function submit() {
  if (saving.value) return
  formError.value = ''
  const employeeId = auth.user?.employeeId
  if (!employeeId) {
    formError.value = t('leave.noEmployeeLinked')
    return
  }

  const formSchema = z.object({
    leaveTypeId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    duration: z.enum(['full', 'morning', 'afternoon']),
    reason: z.string(),
  }).superRefine((values, context) => {
    if (!dayjs(values.startDate).isValid() || !dayjs(values.endDate).isValid()) {
      context.addIssue({ code: 'custom', message: t('leave.invalidDates'), path: ['startDate'] })
      return
    }
    if (dayjs(values.endDate).isBefore(dayjs(values.startDate), 'day')) {
      context.addIssue({ code: 'custom', message: t('leave.endBeforeStart'), path: ['endDate'] })
    }
    if (values.duration !== 'full' && values.startDate !== values.endDate) {
      context.addIssue({ code: 'custom', message: t('leave.halfDaySameDate'), path: ['endDate'] })
    }
  })
  const parsed = formSchema.safeParse(form)
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('common.invalidForm')
    return
  }
  const leaveType = selectedType.value
  if (!leaveType) {
    formError.value = t('leave.selectType')
    return
  }
  if (leaveType.requiresAttachment && !selectedFile.value) {
    formError.value = t('leave.attachmentRequired')
    return
  }
  if (requestDays.value <= 0) {
    formError.value = t('leave.invalidDates')
    return
  }
  const balance = balanceFor(leaveType.id)
  const available = balance ? remaining(balance) : leaveType.daysPerYear
  if (requestDays.value > available) {
    formError.value = t('leave.insufficientBalance')
    return
  }

  saving.value = true
  try {
    await api.leave.requests.create({
      employeeId,
      leaveTypeId: leaveType.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      days: requestDays.value,
      startHalf: parsed.data.duration === 'full' ? null : parsed.data.duration,
      endHalf: parsed.data.duration === 'full' ? null : parsed.data.duration,
      attachmentPath: selectedFile.value?.name ?? null,
      reason: parsed.data.reason.trim() || null,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      cancelledAt: null,
    })
    notify.success(t('toast.leaveSubmitted'), undefined, `leave-submit:${employeeId}:${leaveType.id}:${parsed.data.startDate}:${parsed.data.endDate}`)
    selectedFile.value = null
    form.reason = ''
    form.startDate = ''
    form.endDate = ''
    form.duration = 'full'
    if (import.meta.client) {
      const input = document.getElementById('leave-attachment')
      if (input instanceof HTMLInputElement) input.value = ''
    }
    await load()
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function cancelRequest(request: LeaveRequest) {
  if (saving.value) return
  if (!window.confirm(t('leave.confirmCancel'))) return
  error.value = ''
  saving.value = true
  try {
    await api.leave.cancel(request.id)
    notify.success(t('toast.leaveCancelled'), undefined, `leave-cancel:${request.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header class="border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 class="text-lg font-semibold">{{ t('leave.myBalances', { year: currentYear }) }}</h2>
      </header>
      <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="5" /></div>
      <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }} <button class="ml-2 underline" @click="load">{{ t('common.retry') }}</button></div>
      <div v-else-if="!auth.user?.employeeId" class="p-8 text-center text-sm text-slate-500">{{ t('leave.noEmployeeLinked') }}</div>
      <div v-else-if="balances.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('common.empty') }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr><th class="px-5 py-3">{{ t('leave.leaveType') }}</th><th class="px-5 py-3">{{ t('leave.entitled') }}</th><th class="px-5 py-3">{{ t('leave.used') }}</th><th class="px-5 py-3">{{ t('leave.pending') }}</th><th class="px-5 py-3">{{ t('leave.available') }}</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="balance in balances" :key="balance.id">
              <td class="px-5 py-3 font-medium">{{ typeName(balance.leaveTypeId) }}</td>
              <td class="px-5 py-3">{{ balance.entitled }}</td>
              <td class="px-5 py-3">{{ balance.used }}</td>
              <td class="px-5 py-3">{{ balance.pendingDays }}</td>
              <td class="px-5 py-3 font-semibold">{{ remaining(balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="auth.user?.employeeId" class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header class="border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 class="text-lg font-semibold">{{ t('leave.requestLeave') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('leave.requestHelp') }}</p>
      </header>
      <form class="grid gap-4 p-5 sm:grid-cols-2" @submit.prevent="submit">
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.leaveType') }}</span>
          <AppSelect
            v-model="form.leaveTypeId"
            :options="types.map((type: LeaveType) => ({ label: `${type.name} (${t('leave.daysAvailable', { days: balanceFor(type.id) ? remaining(balanceFor(type.id)!) : type.daysPerYear })})`, value: type.id }))"
            :placeholder="t('leave.selectType')"
            required
          />
          <span v-if="selectedType?.requiresAttachment" class="mt-1 block text-xs text-amber-700 dark:text-amber-400">{{ t('leave.attachmentRequired') }}</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.startDate') }}</span>
          <input v-model="form.startDate" type="date" required class="control" @change="form.duration !== 'full' ? form.endDate = form.startDate : undefined">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.endDate') }}</span>
          <input v-model="form.endDate" type="date" required class="control" :disabled="form.duration !== 'full'">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.duration') }}</span>
          <AppSelect
            v-model="form.duration"
            :options="[
              { label: t('leave.fullDay'), value: 'full' },
              { label: t('leave.halfDayMorning'), value: 'morning' },
              { label: t('leave.halfDayAfternoon'), value: 'afternoon' },
            ]"
            @change="form.duration !== 'full' ? form.endDate = form.startDate : undefined"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.attachment') }}</span>
          <input id="leave-attachment" type="file" :required="selectedType?.requiresAttachment" class="control file:mr-3 file:rounded file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-emerald-700" @change="onFileChange">
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-sm font-medium">{{ t('leave.reason') }}</span>
          <textarea v-model="form.reason" rows="3" class="control" />
        </label>
        <div class="flex items-center justify-between gap-3 sm:col-span-2">
          <span class="text-sm text-slate-500">{{ t('leave.daysRequested', { days: requestDays || 0 }) }}</span>
          <button type="submit" :disabled="saving || loading || types.length === 0" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? t('common.saving') : t('leave.submitRequest') }}</button>
        </div>
        <p v-if="formError" role="alert" class="text-sm text-red-600 sm:col-span-2">{{ formError }}</p>
      </form>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header class="border-b border-slate-200 p-5 dark:border-slate-800"><h2 class="text-lg font-semibold">{{ t('leave.myRequests') }}</h2></header>
      <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="5" /></div>
      <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }} <button class="ml-2 underline" @click="load">{{ t('common.retry') }}</button></div>
      <div v-else-if="!auth.user?.employeeId" class="p-8 text-center text-sm text-slate-500">{{ t('leave.noEmployeeLinked') }}</div>
      <div v-else-if="userRequests.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('common.empty') }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th class="px-5 py-3">{{ t('leave.leaveType') }}</th><th class="px-5 py-3">{{ t('leave.period') }}</th><th class="px-5 py-3">{{ t('leave.days') }}</th><th class="px-5 py-3">{{ t('leave.status') }}</th><th class="px-5 py-3">{{ t('leave.reviewerComment') }}</th><th class="px-5 py-3">{{ t('common.actions') }}</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="request in userRequests" :key="request.id">
              <td class="px-5 py-3">{{ typeName(request.leaveTypeId) }}</td>
              <td class="whitespace-nowrap px-5 py-3">{{ request.startDate }} – {{ request.endDate }}</td>
              <td class="px-5 py-3">{{ request.days }}<span v-if="request.halfDayPeriod" class="text-xs text-slate-500"> · {{ t(`leave.${request.halfDayPeriod}`) }}</span></td>
              <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': request.status === 'pending',
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': request.status === 'approved',
                'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300': request.status === 'rejected',
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300': request.status === 'cancelled',
              }">{{ t(`leave.statuses.${request.status}`) }}</span></td>
              <td class="px-5 py-3">{{ request.reviewerComment || t('common.notSet') }}</td>
              <td class="px-5 py-3"><button v-if="request.status === 'pending'" :disabled="saving" class="text-red-600 hover:underline disabled:opacity-50" @click="cancelRequest(request)">{{ t('leave.cancelRequest') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
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
