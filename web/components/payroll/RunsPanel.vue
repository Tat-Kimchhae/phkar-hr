<script setup lang="ts">
import AppSelect from '~/components/app/AppSelect.vue'
import type { PayrollPeriod, PayrollRun, Payslip } from '~/types'
import type { Employee } from '~/types'
import type { PayrollCalculation } from '~/utils/payrollCalculation'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const { can } = usePermission()
const api = useHrApi()
const notify = useNotify()
const payroll = usePayroll()
const periods = ref<PayrollPeriod[]>([])
const runs = ref<PayrollRun[]>([])
const payslips = ref<Payslip[]>([])
const employees = ref<Employee[]>([])
const selectedPeriodId = ref('')
const selectedRunId = ref('')
const previewRows = ref<PayrollCalculation[]>([])
const previewPeriodId = ref('')
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const actionError = ref('')
const actionSuccess = ref('')

const selectedPeriod = computed(() => periods.value.find((period: PayrollPeriod) => period.id === selectedPeriodId.value) ?? null)
const selectedRun = computed(() => runs.value.find((run: PayrollRun) => run.id === selectedRunId.value) ?? null)
const runExistsForSelectedPeriod = computed(() => Boolean(selectedPeriod.value
  && runs.value.some((run: PayrollRun) => run.periodId === selectedPeriod.value?.id && run.status !== 'cancelled')))
const canComputePreview = computed(() => previewPeriodId.value === selectedPeriodId.value && previewRows.value.length > 0)
const canManagePayroll = computed(() => can('payroll.manage'))
const previewTotals = computed(() => previewRows.value.reduce((totals: { gross: number; deductions: number; net: number }, row: PayrollCalculation) => ({
  gross: totals.gross + row.grossAmount,
  deductions: totals.deductions + row.totalDeductions,
  net: totals.net + row.netAmount,
}), { gross: 0, deductions: 0, net: 0 }))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [periodPage, runPage, slipPage, employeePage] = await Promise.all([
      api.payroll.periods.list({ sortBy: 'startDate', sortDirection: 'desc' }),
      api.payroll.runs.list({ sortBy: 'createdAt', sortDirection: 'desc' }),
      api.payroll.payslips.list(),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
    ])
    periods.value = periodPage.items
    runs.value = runPage.items
    payslips.value = slipPage.items
    employees.value = employeePage.items
    if (!selectedPeriodId.value && periodPage.items[0]) selectedPeriodId.value = periodPage.items[0].id
    if (selectedRunId.value && !runPage.items.some((run: PayrollRun) => run.id === selectedRunId.value)) selectedRunId.value = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

async function preparePreview() {
  if (!selectedPeriod.value) return
  busy.value = true
  actionError.value = ''
  actionSuccess.value = ''
  previewRows.value = []
  previewPeriodId.value = ''
  selectedRunId.value = ''
  try {
    previewRows.value = await payroll.preview(selectedPeriod.value)
    previewPeriodId.value = selectedPeriod.value.id
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : t('payroll.computeError')
  } finally {
    busy.value = false
  }
}

async function computeRun() {
  if (busy.value || !selectedPeriod.value || !canComputePreview.value || runExistsForSelectedPeriod.value) return
  busy.value = true
  actionError.value = ''
  actionSuccess.value = ''
  try {
    const periodId = selectedPeriod.value.id
    const run = await payroll.compute(selectedPeriod.value)
    notify.success(t('toast.payrollComputed'), undefined, `payroll-compute:${periodId}`)
    selectedRunId.value = run.id
    previewRows.value = []
    previewPeriodId.value = ''
    actionSuccess.value = t('payroll.computed')
    await load()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : t('payroll.computeError')
  } finally {
    busy.value = false
  }
}

async function changeRunStatus(status: 'completed' | 'locked') {
  if (busy.value || !selectedRun.value) return
  const runId = selectedRun.value.id
  busy.value = true
  actionError.value = ''
  actionSuccess.value = ''
  try {
    if (status === 'completed') await api.payroll.approveRun(selectedRun.value.id)
    else await api.payroll.lockRun(selectedRun.value.id)
    notify.success(t(status === 'completed' ? 'toast.runApproved' : 'toast.runLocked'), undefined, `payroll-run-${status}:${runId}`)
    actionSuccess.value = status === 'completed' ? t('payroll.approved') : t('payroll.locked')
    await load()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    busy.value = false
  }
}

function selectRun(id: string) {
  selectedRunId.value = id
  previewRows.value = []
  previewPeriodId.value = ''
}

function slipCount(runId: string): number {
  return payslips.value.filter((slip: Payslip) => slip.payrollRunId === runId).length
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

function employeeName(employeeId: string): string {
  const employee = employees.value.find((item: Employee) => item.id === employeeId)
  return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNo})` : t('common.notSet')
}

onMounted(load)

function periodName(id: string): string {
  const period = periods.value.find((item: PayrollPeriod) => item.id === id)
  return period ? `${period.startDate} – ${period.endDate}` : t('common.notSet')
}

function runPayslips(runId: string): Payslip[] {
  return payslips.value.filter((slip: Payslip) => slip.payrollRunId === runId)
}
</script>

<template>
  <section class="space-y-5">
    <div class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header class="border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 class="text-lg font-semibold">{{ t('payroll.runWizard') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('payroll.wizardDescription') }}</p>
      </header>
      <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonForm :fields="4" /></div>
      <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button></div>
      <div v-else class="space-y-5 p-5">
        <label class="block max-w-md"><span class="mb-1.5 block text-sm font-medium">{{ t('payroll.selectPeriod') }}</span>
          <AppSelect
            v-model="selectedPeriodId"
            :options="periods.map((period: PayrollPeriod) => ({ label: periodName(period.id), value: period.id }))"
            :placeholder="t('payroll.selectPeriodPlaceholder')"
            @change="previewRows = []; previewPeriodId = ''; selectedRunId = ''"
          />
        </label>
        <div v-if="selectedPeriod && canManagePayroll" class="flex flex-wrap gap-2">
          <button type="button" :disabled="busy || runExistsForSelectedPeriod" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700" @click="preparePreview">{{ busy ? t('common.loading') : t('payroll.previewPayroll') }}</button>
          <button type="button" :disabled="busy || !canComputePreview || runExistsForSelectedPeriod" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="computeRun">{{ t('payroll.computePayroll') }}</button>
          <span v-if="runExistsForSelectedPeriod" class="self-center text-sm text-slate-500">{{ t('payroll.runAlreadyExists') }}</span>
        </div>
        <p v-if="actionError" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ actionError }}</p>
        <p v-if="actionSuccess" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{{ actionSuccess }}</p>
        <div v-if="previewRows.length" class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
            <div><h3 class="font-semibold">{{ t('payroll.preview') }}</h3><p class="text-xs text-slate-500">{{ t('payroll.demoRateNotice') }}</p></div>
            <p class="text-sm font-medium">{{ t('payroll.employeeCount', { count: previewRows.length }) }}</p>
          </div>
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th class="px-4 py-3">{{ t('payroll.employee') }}</th><th class="px-4 py-3">{{ t('payroll.gross') }}</th><th class="px-4 py-3">{{ t('payroll.deductions') }}</th><th class="px-4 py-3">{{ t('payroll.net') }}</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="row in previewRows" :key="row.employee.id"><td class="whitespace-nowrap px-4 py-3">{{ row.employee.firstName }} {{ row.employee.lastName }} ({{ row.employee.employeeNo }})</td><td class="px-4 py-3">{{ money(row.grossAmount, row.currency) }}</td><td class="px-4 py-3">{{ money(row.totalDeductions, row.currency) }}</td><td class="px-4 py-3 font-semibold">{{ money(row.netAmount, row.currency) }}</td></tr>
              <tr class="bg-slate-50 font-semibold dark:bg-slate-900"><td class="px-4 py-3">{{ t('payroll.total') }}</td><td class="px-4 py-3">{{ money(previewTotals.gross, previewRows[0]?.currency ?? 'USD') }}</td><td class="px-4 py-3">{{ money(previewTotals.deductions, previewRows[0]?.currency ?? 'USD') }}</td><td class="px-4 py-3">{{ money(previewTotals.net, previewRows[0]?.currency ?? 'USD') }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header class="border-b border-slate-200 p-5 dark:border-slate-800"><h2 class="text-lg font-semibold">{{ t('payroll.runs') }}</h2><p class="mt-1 text-sm text-slate-500">{{ t('payroll.runsDescription') }}</p></header>
      <div v-if="runs.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('payroll.noRuns') }}</div>
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <article v-for="run in runs" :key="run.id" class="flex flex-wrap items-center justify-between gap-3 p-5">
          <button type="button" class="text-left" @click="selectRun(run.id)">
            <span class="block font-semibold">{{ periodName(run.periodId) }}</span>
            <span class="mt-1 block text-sm text-slate-500">{{ t('payroll.employeeCount', { count: slipCount(run.id) }) }} · {{ t(`payroll.statuses.${run.status}`) }}</span>
          </button>
          <div class="flex flex-wrap items-center gap-2">
            <button v-if="canManagePayroll && run.status === 'processing'" type="button" :disabled="busy" class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="selectRun(run.id); changeRunStatus('completed')">{{ t('payroll.approvePayroll') }}</button>
            <button v-else-if="canManagePayroll && run.status === 'completed'" type="button" :disabled="busy" class="rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50 dark:text-amber-300" @click="selectRun(run.id); changeRunStatus('locked')">{{ t('payroll.lockRun') }}</button>
            <span v-else-if="run.status === 'locked'" class="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ t('payroll.readOnly') }}</span>
            <button type="button" class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400" @click="selectRun(run.id)">{{ t('payroll.viewPayslips') }}</button>
          </div>
        </article>
      </div>
      <div v-if="selectedRun" class="border-t border-slate-200 dark:border-slate-800">
        <div class="flex flex-wrap items-center justify-between gap-3 p-5">
          <div><h3 class="font-semibold">{{ t('payroll.payslips') }} · {{ periodName(selectedRun.periodId) }}</h3><p class="text-sm text-slate-500">{{ t('payroll.runStatus') }}: {{ t(`payroll.statuses.${selectedRun.status}`) }}</p></div>
          <span v-if="selectedRun.status === 'locked'" class="text-sm font-medium text-slate-500">{{ t('payroll.readOnly') }}</span>
        </div>
        <div v-if="runPayslips(selectedRun.id).length === 0" class="px-5 pb-5 text-sm text-slate-500">{{ t('payroll.noPayslips') }}</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th class="px-5 py-3">{{ t('payroll.employee') }}</th><th class="px-5 py-3">{{ t('payroll.gross') }}</th><th class="px-5 py-3">{{ t('payroll.deductions') }}</th><th class="px-5 py-3">{{ t('payroll.net') }}</th><th class="px-5 py-3">{{ t('common.actions') }}</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="slip in runPayslips(selectedRun.id)" :key="slip.id"><td class="px-5 py-3">{{ employeeName(slip.employeeId) }}</td><td class="px-5 py-3">{{ money(slip.gross, slip.currency) }}</td><td class="px-5 py-3">{{ money(slip.totalDeductions, slip.currency) }}</td><td class="px-5 py-3 font-semibold">{{ money(slip.net, slip.currency) }}</td><td class="px-5 py-3"><NuxtLink :to="`/payroll/payslips/${slip.id}`" class="font-medium text-emerald-700 hover:underline dark:text-emerald-400">{{ t('payroll.viewPayslip') }}</NuxtLink></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.payroll-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
