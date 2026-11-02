<script setup lang="ts">
import type { Employee, PayrollPeriod, PayrollRun, Payslip, PayslipItem } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const route = useRoute()
const api = useHrApi()
const notify = useNotify()
const payslip = ref<Payslip | null>(null)
const items = ref<PayslipItem[]>([])
const employee = ref<Employee | null>(null)
const period = ref<PayrollPeriod | null>(null)
const run = ref<PayrollRun | null>(null)
const loading = ref(true)
const error = ref('')

const earnings = computed(() => items.value.filter((item: PayslipItem) => item.type === 'earning'))
const deductions = computed(() => items.value.filter((item: PayslipItem) => item.type === 'deduction'))

function money(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: payslip.value?.currency ?? 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const record = await api.payroll.payslips.getById(String(route.params.id))
    if (!record) {
      payslip.value = null
      return
    }
    const [itemPage, employeeRecord, payrollRun] = await Promise.all([
      api.payroll.payslipItems.list({ filter: { payslipId: record.id }, sortBy: 'type' }),
      api.employees.employees.getById(record.employeeId),
      api.payroll.runs.getById(record.payrollRunId),
    ])
    const payrollPeriod = payrollRun
      ? await api.payroll.periods.getById(payrollRun.periodId)
      : null
    payslip.value = record
    items.value = itemPage.items
    employee.value = employeeRecord
    run.value = payrollRun
    period.value = payrollPeriod
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function printPayslip() {
  window.print()
  notify.success(t('toast.payslipPrinted'), undefined, `payslip-print:${route.params.id}`)
}

const { pending: pagePending } = await useAsyncData(`payslip-detail-${route.params.id}`, async () => { await load(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between print:hidden">
      <NuxtLink to="/payroll" class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">← {{ t('payroll.backToPayroll') }}</NuxtLink>
      <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="printPayslip">{{ t('payroll.printPayslip') }}</button>
    </div>
    <div v-if="showSkeleton && !error" aria-hidden="true"><SkeletonDetail :tabs="0" /></div>
    <div v-else-if="error" role="alert" class="rounded-xl bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{{ error }}</p><button class="mt-2 underline print:hidden" @click="load">{{ t('common.retry') }}</button></div>
    <div v-else-if="!payslip" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">{{ t('payroll.payslipNotFound') }}</div>
    <article v-else class="mx-auto max-w-4xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 print:max-w-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 print:border-slate-300">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 print:text-black">{{ t('app.name') }}</p>
          <h1 class="mt-2 text-2xl font-bold">{{ t('payroll.payslip') }}</h1>
          <p class="mt-1 text-sm text-slate-500 print:text-slate-700">{{ period?.name ?? t('common.notSet') }} · {{ period?.startDate }} – {{ period?.endDate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <AppAvatar v-if="employee" :employee="employee" size="md" />
          <div class="text-right">
            <p class="font-semibold">{{ employee ? `${employee.firstName} ${employee.lastName}` : t('common.notSet') }}</p>
            <p class="mt-1 text-sm text-slate-500 print:text-slate-700">{{ employee?.employeeNo ?? t('common.notSet') }}</p>
            <p class="mt-2 text-xs text-slate-500 print:text-slate-700">{{ t('payroll.runStatus') }}: {{ run ? t(`payroll.statuses.${run.status}`) : t('common.notSet') }}</p>
          </div>
        </div>
      </header>
      <p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200 print:border print:border-amber-400 print:bg-white print:text-black">{{ t('payroll.demoRateNotice') }}</p>
      <section>
        <h2 class="mb-3 text-lg font-semibold">{{ t('payroll.earnings') }}</h2>
        <div v-if="earnings.length === 0" class="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">{{ t('payroll.noPayslipItems') }}</div>
        <div v-else class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 print:bg-slate-100"><tr><th class="px-4 py-3">{{ t('payroll.description') }}</th><th class="px-4 py-3 text-right">{{ t('payroll.amount') }}</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="item in earnings" :key="item.id"><td class="px-4 py-3">{{ item.name }}</td><td class="px-4 py-3 text-right font-medium">{{ money(item.amount) }}</td></tr>
            </tbody>
            <tfoot class="border-t border-slate-200 font-semibold dark:border-slate-800 print:border-slate-300"><tr><td class="px-4 py-3">{{ t('payroll.gross') }}</td><td class="px-4 py-3 text-right">{{ money(payslip.gross) }}</td></tr></tfoot>
          </table>
        </div>
      </section>
      <section>
        <h2 class="mb-3 text-lg font-semibold">{{ t('payroll.deductions') }}</h2>
        <div v-if="deductions.length === 0" class="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">{{ t('payroll.noPayslipItems') }}</div>
        <div v-else class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 print:bg-slate-100"><tr><th class="px-4 py-3">{{ t('payroll.description') }}</th><th class="px-4 py-3 text-right">{{ t('payroll.amount') }}</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="item in deductions" :key="item.id"><td class="px-4 py-3">{{ item.name }}</td><td class="px-4 py-3 text-right font-medium">{{ money(item.amount) }}</td></tr>
            </tbody>
            <tfoot class="border-t border-slate-200 font-semibold dark:border-slate-800 print:border-slate-300"><tr><td colspan="3" class="px-4 py-3">{{ t('payroll.totalDeductions') }}</td><td class="px-4 py-3 text-right">{{ money(payslip.totalDeductions) }}</td></tr></tfoot>
          </table>
        </div>
      </section>
      <footer class="flex items-center justify-between rounded-lg bg-emerald-50 p-5 dark:bg-emerald-950 print:border print:border-emerald-600 print:bg-white">
        <span class="text-lg font-semibold">{{ t('payroll.netPay') }}</span><span class="text-2xl font-bold">{{ money(payslip.net) }}</span>
      </footer>
      <p class="text-xs text-slate-500 print:text-slate-700">{{ t('payroll.printFooter') }}</p>
    </article>
  </div>
</template>

<style>
@media print {
  body {
    min-width: 0;
    background: white !important;
  }
}
</style>
