<script setup lang="ts">
import dayjs from 'dayjs'
import { z } from 'zod'
import AppSelect from '~/components/app/AppSelect.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'
import type {
  AttendanceCorrection,
  AttendanceLog,
  Employee,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Payslip,
  PayslipItem,
} from '~/types'
import { employeePhotoValidationError } from '~/utils/employeePhoto'

const { t } = useI18n()
const auth = useAuthStore()
const notify = useNotify()
const api = useHrApi()
const loading = ref(true)
const loadError = ref(false)
const saving = ref(false)
const formError = ref('')
const notice = ref('')
const photoError = ref('')
const photoNotice = ref('')
const photoSaving = ref(false)
const photoPreview = ref('')
const photoInput = ref<HTMLInputElement | null>(null)
const employee = ref<Employee | null>(null)
const balances = ref<LeaveBalance[]>([])
const leaveTypes = ref<LeaveType[]>([])
const leaveRequests = ref<LeaveRequest[]>([])
const logs = ref<AttendanceLog[]>([])
const corrections = ref<AttendanceCorrection[]>([])
const payslips = ref<Payslip[]>([])
const payslipItems = ref<PayslipItem[]>([])
const tabs = ['profile', 'payslips', 'leave', 'attendance', 'corrections'] as const
type SelfServiceTab = typeof tabs[number]
const activeTab = ref<SelfServiceTab>('profile')

const correctionSchema = z.object({
  attendanceLogId: z.string().min(1),
  requestedCheckInAt: z.string().refine(value => !value || dayjs(value).isValid()),
  requestedCheckOutAt: z.string().refine(value => !value || dayjs(value).isValid()),
  reason: z.string().trim().min(5).max(500),
}).refine(value => value.requestedCheckInAt.length > 0 || value.requestedCheckOutAt.length > 0)
const correctionForm = reactive({
  attendanceLogId: '',
  requestedCheckInAt: '',
  requestedCheckOutAt: '',
  reason: '',
})
const payslipItemsById = computed(() => {
  const result = new Map<string, PayslipItem[]>()
  for (const item of payslipItems.value) {
    result.set(item.payslipId, [...(result.get(item.payslipId) ?? []), item])
  }
  return result
})
const leaveTypeNames = computed(() => new Map(leaveTypes.value.map((type: LeaveType) => [type.id, type.name])))

async function loadSelfService() {
  loading.value = true
  loadError.value = false
  try {
    const employeeId = auth.user?.employeeId
    if (!employeeId) return
    const [employeeRecord, balancePage, leaveTypePage, leavePage, logPage, correctionPage, payslipPage, itemPage] = await Promise.all([
      api.employees.employees.getById(employeeId),
      api.leave.balances.list({ filter: { employeeId } }),
      api.leave.types.list(),
      api.leave.requests.list({ filter: { employeeId } }),
      api.attendance.logs.list({ filter: { employeeId } }),
      api.attendance.corrections.list({ filter: { employeeId } }),
      api.payroll.payslips.list({ sortBy: 'issuedAt', sortDirection: 'desc' }),
      api.payroll.payslipItems.list(),
    ])
    employee.value = employeeRecord
    balances.value = balancePage.items
    leaveTypes.value = leaveTypePage.items
    leaveRequests.value = leavePage.items.sort((a, b) => b.startDate.localeCompare(a.startDate))
    logs.value = logPage.items.sort((a, b) => b.workDate.localeCompare(a.workDate))
    corrections.value = correctionPage.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    payslips.value = payslipPage.items
    payslipItems.value = itemPage.items
  } catch (error) {
    console.error('Could not load self-service data.', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function formatDateTime(value: string | null) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : t('common.notSet')
}

function toIsoDateTime(value: string) {
  return value ? dayjs(value).toISOString() : null
}

async function submitCorrection() {
  if (saving.value) return
  formError.value = ''
  notice.value = ''
  const parsed = correctionSchema.safeParse(correctionForm)
  if (!parsed.success) {
    formError.value = t('common.invalidForm')
    return
  }
  const employeeId = auth.user?.employeeId
  if (!employeeId) return
  saving.value = true
  try {
    const correction = await api.attendance.corrections.create({
      employeeId,
      attendanceLogId: parsed.data.attendanceLogId,
      workDate: dayjs(parsed.data.requestedCheckInAt || parsed.data.requestedCheckOutAt).format('YYYY-MM-DD'),
      requestedCheckIn: toIsoDateTime(parsed.data.requestedCheckInAt),
      requestedCheckOut: toIsoDateTime(parsed.data.requestedCheckOutAt),
      reason: parsed.data.reason,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
    })
    correctionForm.attendanceLogId = ''
    correctionForm.requestedCheckInAt = ''
    correctionForm.requestedCheckOutAt = ''
    correctionForm.reason = ''
    notice.value = t('me.correctionSubmitted')
    notify.success(t('toast.correctionSubmitted'), undefined, `attendance-correction-submit:${correction.id}`)
    await loadSelfService()
  } catch (error) {
    console.error('Could not submit attendance correction.', error)
    formError.value = t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function selectOwnPhoto(event: Event) {
  if (photoSaving.value) return
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !employee.value) return

  const validationError = employeePhotoValidationError(file)
  if (validationError) {
    photoError.value = t(`employees.${validationError}`)
    photoNotice.value = ''
    input.value = ''
    return
  }

  const previewUrl = URL.createObjectURL(file)
  photoPreview.value = previewUrl
  photoError.value = ''
  photoNotice.value = ''
  photoSaving.value = true
  try {
    employee.value = await api.employees.photos.upload(employee.value.id, file)
    photoNotice.value = t('employees.photoSaved')
    notify.success(t('toast.photoUploaded'), undefined, `employee-photo-upload:${employee.value.id}`)
  } catch (error) {
    photoError.value = error instanceof Error ? error.message : t('common.saveError')
  } finally {
    URL.revokeObjectURL(previewUrl)
    photoPreview.value = ''
    photoSaving.value = false
    if (photoInput.value) photoInput.value.value = ''
  }
}

async function removeOwnPhoto() {
  if (photoSaving.value || !employee.value) return
  photoError.value = ''
  photoNotice.value = ''
  photoSaving.value = true
  try {
    employee.value = await api.employees.photos.remove(employee.value.id)
    photoNotice.value = t('employees.photoSaved')
    notify.success(t('toast.photoRemoved'), undefined, `employee-photo-remove:${employee.value.id}`)
  } catch (error) {
    photoError.value = error instanceof Error ? error.message : t('common.saveError')
  } finally {
    photoSaving.value = false
  }
}

const { pending: pagePending } = await useAsyncData('self-service-page-data', async () => { await loadSelfService(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !loadError.value && (loading.value || pagePending.value)))
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">{{ t('me.title') }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ auth.user?.name }} · {{ auth.user?.email }}</p>
    </header>

    <div v-if="showSkeleton && !loadError" aria-hidden="true"><SkeletonDetail /></div>
    <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {{ t('common.loadError') }}
      <button type="button" class="ml-2 font-semibold underline" @click="loadSelfService">{{ t('common.retry') }}</button>
    </div>
    <template v-else>
      <p v-if="!auth.user?.employeeId" class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {{ t('me.noEmployeeLink') }}
      </p>
      <template v-else>
        <nav class="flex flex-wrap gap-2" :aria-label="t('me.sections')">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            :class="activeTab === tab ? '!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''"
            @click="activeTab = tab"
          >
            {{ t(`me.tabs.${tab}`) }}
          </button>
        </nav>

        <section v-if="activeTab === 'profile'" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div class="flex flex-wrap items-center gap-4">
            <AppAvatar v-if="employee" :employee="employee" :photo-path="photoPreview || employee.photoPath" size="lg" />
            <div class="min-w-0 flex-1">
              <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.profile') }}</h2>
              <label v-if="employee" class="mt-2 block">
                <span class="sr-only">{{ t('employees.photo') }}</span>
                <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" :disabled="photoSaving" class="block max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-medium file:text-emerald-800 disabled:opacity-60 dark:text-slate-300 dark:file:bg-emerald-950 dark:file:text-emerald-300" @change="selectOwnPhoto">
              </label>
              <p class="mt-1 text-xs text-slate-500">{{ t('employees.photoRequirements') }}</p>
              <button v-if="employee?.photoPath" type="button" :disabled="photoSaving" class="mt-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400" @click="removeOwnPhoto">{{ photoSaving ? t('common.saving') : t('employees.removePhoto') }}</button>
              <p v-if="photoError" role="alert" class="mt-1 text-sm text-red-600">{{ photoError }}</p>
              <p v-else-if="photoNotice" role="status" class="mt-1 text-sm text-emerald-700 dark:text-emerald-400">{{ photoNotice }}</p>
            </div>
          </div>
          <dl v-if="employee" class="mt-4 grid gap-4 sm:grid-cols-2">
            <div><dt class="text-sm text-slate-500">{{ t('employees.fields.employeeNo') }}</dt><dd class="mt-1 text-slate-900 dark:text-white">{{ employee.employeeNo }}</dd></div>
            <div><dt class="text-sm text-slate-500">{{ t('employees.fields.firstName') }} / {{ t('employees.fields.lastName') }}</dt><dd class="mt-1 text-slate-900 dark:text-white">{{ employee.firstName }} {{ employee.lastName }}</dd></div>
            <div><dt class="text-sm text-slate-500">{{ t('employees.fields.firstNameKh') }} / {{ t('employees.fields.lastNameKh') }}</dt><dd class="mt-1 text-slate-900 dark:text-white">{{ employee.firstNameKh || t('common.notSet') }} {{ employee.lastNameKh || '' }}</dd></div>
            <div><dt class="text-sm text-slate-500">{{ t('employees.fields.email') }}</dt><dd class="mt-1 text-slate-900 dark:text-white">{{ employee.email || t('common.notSet') }}</dd></div>
            <div><dt class="text-sm text-slate-500">{{ t('employees.fields.phone') }}</dt><dd class="mt-1 text-slate-900 dark:text-white">{{ employee.phone || t('common.notSet') }}</dd></div>
            <div><dt class="text-sm text-slate-500">{{ t('employees.fields.hireDate') }}</dt><dd class="mt-1 text-slate-900 dark:text-white">{{ employee.hireDate }}</dd></div>
          </dl>
          <p v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('me.profileUnavailable') }}</p>
        </section>

        <section v-else-if="activeTab === 'payslips'" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.tabs.payslips') }}</h2>
          <p v-if="!payslips.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('common.empty') }}</p>
          <div v-else class="mt-4 space-y-4">
            <article v-for="payslip in payslips" :key="payslip.id" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div class="flex flex-wrap justify-between gap-2">
                <p class="font-medium text-slate-900 dark:text-white">{{ t('me.issued') }}: {{ payslip.issuedAt || t('common.notSet') }}</p>
                <p class="font-semibold text-slate-900 dark:text-white">{{ payslip.currency }} {{ payslip.netAmount.toFixed(2) }}</p>
              </div>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('me.gross') }}: {{ payslip.grossAmount.toFixed(2) }} · {{ t('me.deductions') }}: {{ payslip.totalDeductions.toFixed(2) }}</p>
              <ul v-if="payslipItemsById.get(payslip.id)?.length" class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <li v-for="item in payslipItemsById.get(payslip.id)" :key="item.id" class="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                  <span>{{ item.label }}</span><span>{{ item.amount.toFixed(2) }}</span>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section v-else-if="activeTab === 'leave'" class="space-y-5">
          <article class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.leaveBalances') }}</h2>
            <p v-if="!balances.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('common.empty') }}</p>
            <ul v-else class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="balance in balances" :key="balance.id" class="flex justify-between gap-3 py-3 text-sm">
                <span class="text-slate-700 dark:text-slate-200">{{ leaveTypeNames.get(balance.leaveTypeId) || t('common.notSet') }} · {{ balance.year }}</span>
                <span class="text-slate-600 dark:text-slate-300">{{ t('me.daysAvailable', { days: balance.openingBalance + balance.accruedDays - balance.usedDays - balance.pendingDays }) }}</span>
              </li>
            </ul>
          </article>
          <article class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.leaveRequests') }}</h2>
            <p v-if="!leaveRequests.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('common.empty') }}</p>
            <div v-else class="mt-4 overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="text-slate-500"><tr><th class="py-2 pr-4">{{ t('leave.startDate') }}</th><th class="py-2 pr-4">{{ t('leave.endDate') }}</th><th class="py-2 pr-4">{{ t('leave.days') }}</th><th class="py-2">{{ t('leave.status') }}</th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="request in leaveRequests" :key="request.id"><td class="py-3 pr-4">{{ request.startDate }}</td><td class="py-3 pr-4">{{ request.endDate }}</td><td class="py-3 pr-4">{{ request.days }}</td><td class="py-3">{{ t(`leave.statuses.${request.status}`) }}</td></tr>
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section v-else-if="activeTab === 'attendance'" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.tabs.attendance') }}</h2>
          <p v-if="!logs.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('common.empty') }}</p>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="text-slate-500"><tr><th class="py-2 pr-4">{{ t('attendance.date') }}</th><th class="py-2 pr-4">{{ t('attendance.checkIn') }}</th><th class="py-2 pr-4">{{ t('attendance.checkOut') }}</th><th class="py-2">{{ t('attendance.method') }}</th></tr></thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="log in logs" :key="log.id"><td class="py-3 pr-4">{{ log.checkIn ? dayjs(log.checkIn).format('YYYY-MM-DD') : t('common.notSet') }}</td><td class="py-3 pr-4">{{ formatDateTime(log.checkIn) }}</td><td class="py-3 pr-4">{{ formatDateTime(log.checkOut) }}</td><td class="py-3">{{ log.method }}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-else class="space-y-5">
          <article class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.requestCorrection') }}</h2>
            <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="submitCorrection">
              <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span>{{ t('attendance.log') }}</span>
                <AppSelect
                  v-model="correctionForm.attendanceLogId"
                  :options="logs.map((log: AttendanceLog) => ({ label: log.checkIn ? dayjs(log.checkIn).format('YYYY-MM-DD HH:mm') : log.id, value: log.id }))"
                  :placeholder="t('me.selectLog')"
                  required
                />
              </label>
              <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300"><span>{{ t('attendance.checkIn') }}</span><input v-model="correctionForm.requestedCheckInAt" type="datetime-local" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"></label>
              <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300"><span>{{ t('attendance.checkOut') }}</span><input v-model="correctionForm.requestedCheckOutAt" type="datetime-local" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"></label>
              <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2"><span>{{ t('attendance.reason') }}</span><textarea v-model="correctionForm.reason" required minlength="5" maxlength="500" rows="3" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-300 dark:bg-slate-950" /></label>
              <div class="md:col-span-2">
                <p v-if="formError" role="alert" class="mb-3 text-sm text-red-600 dark:text-red-300">{{ formError }}</p>
                <p v-if="notice" role="status" class="mb-3 text-sm text-emerald-700 dark:text-emerald-300">{{ notice }}</p>
                <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{{ saving ? t('common.saving') : t('me.submitCorrection') }}</button>
              </div>
            </form>
          </article>
          <article class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('me.correctionHistory') }}</h2>
            <p v-if="!corrections.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('common.empty') }}</p>
            <ul v-else class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="correction in corrections" :key="correction.id" class="py-3">
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ correction.reason }} · {{ t(`attendance.statuses.${correction.status}`) }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ correction.reviewerComment || formatDateTime(correction.createdAt) }}</p>
              </li>
            </ul>
          </article>
        </section>
      </template>
    </template>
  </div>
</template>
