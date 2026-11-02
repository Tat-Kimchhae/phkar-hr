<script setup lang="ts">
import dayjs from 'dayjs'
import AppSelect from '~/components/app/AppSelect.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'
import type {
  AttendanceLog,
  Employee,
  LeaveRequest,
  LeaveType,
  PayrollPeriod,
  PayrollRun,
  Payslip,
} from '~/types'
import { exportReport, type ReportColumn } from '~/utils/reportExport'

type ReportKind = 'attendance' | 'leave' | 'payroll'

const { t } = useI18n()
const auth = useAuthStore()
const api = useHrApi()
const notify = useNotify()
const loading = ref(true)
const loadError = ref(false)
const employees = ref<Employee[]>([])
const attendanceLogs = ref<AttendanceLog[]>([])
const leaveRequests = ref<LeaveRequest[]>([])
const leaveTypes = ref<LeaveType[]>([])
const payrollPeriods = ref<PayrollPeriod[]>([])
const payrollRuns = ref<PayrollRun[]>([])
const payslips = ref<Payslip[]>([])
const reportKind = ref<ReportKind>('attendance')
const employeeId = ref('')
const today = dayjs().format('YYYY-MM-DD')
const fromDate = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const toDate = ref(today)
const validDateRange = computed(() => fromDate.value <= toDate.value)
const isPayrollAllowed = computed(() => auth.user?.role === 'admin' || auth.user?.role === 'hr')
const employeeNames = computed(() => new Map(employees.value.map((employee: Employee) => [
  employee.id,
  `${employee.firstName} ${employee.lastName}`,
])))
const runsById = computed(() => new Map(payrollRuns.value.map((run: PayrollRun) => [run.id, run])))
const periodsById = computed(() => new Map(payrollPeriods.value.map((period: PayrollPeriod) => [period.id, period])))
const leaveTypeNames = computed(() => new Map(leaveTypes.value.map((type: LeaveType) => [type.id, type.name])))
const filteredAttendance = computed(() => attendanceLogs.value.filter((log: AttendanceLog) => {
  const date = log.workDate
  return date >= fromDate.value && date <= toDate.value
    && (!employeeId.value || log.employeeId === employeeId.value)
}))
const filteredLeave = computed(() => leaveRequests.value.filter((request: LeaveRequest) =>
  request.startDate <= toDate.value && request.endDate >= fromDate.value
  && (!employeeId.value || request.employeeId === employeeId.value),
))
const filteredPayroll = computed(() => payslips.value.flatMap((payslip: Payslip) => {
  const run = runsById.value.get(payslip.payrollRunId)
  const period = run ? periodsById.value.get(run.periodId) : undefined
  if (!period || period.startDate > toDate.value || period.endDate < fromDate.value) return []
  if (employeeId.value && payslip.employeeId !== employeeId.value) return []
  return [{
    id: payslip.id,
    period: `${period.startDate} – ${period.endDate}`,
    employee: employeeNames.value.get(payslip.employeeId) ?? payslip.employeeId,
    currency: payslip.currency,
    gross: payslip.gross,
    deductions: payslip.totalDeductions,
    net: payslip.net,
    status: t(`payroll.statuses.${payslip.status}`),
  }]
}))
const reportColumns = computed<ReportColumn[]>(() => {
  if (reportKind.value === 'attendance') return [
    { key: 'date', label: t('attendance.date') },
    { key: 'employee', label: t('attendance.employee') },
    { key: 'checkIn', label: t('attendance.checkIn') },
    { key: 'checkOut', label: t('attendance.checkOut') },
    { key: 'method', label: t('attendance.method') },
  ]
  if (reportKind.value === 'leave') return [
    { key: 'employee', label: t('attendance.employee') },
    { key: 'type', label: t('leave.leaveType') },
    { key: 'startDate', label: t('leave.startDate') },
    { key: 'endDate', label: t('leave.endDate') },
    { key: 'days', label: t('leave.days') },
    { key: 'status', label: t('leave.status') },
  ]
  return [
    { key: 'period', label: t('reports.period') },
    { key: 'employee', label: t('attendance.employee') },
    { key: 'currency', label: t('payroll.currency') },
    { key: 'gross', label: t('payroll.gross') },
    { key: 'deductions', label: t('payroll.totalDeductions') },
    { key: 'net', label: t('payroll.netPay') },
    { key: 'status', label: t('payroll.status') },
  ]
})
const filteredRows = computed<Record<string, unknown>[]>(() => {
  if (reportKind.value === 'attendance') {
    return filteredAttendance.value.map((log: AttendanceLog) => ({
      date: log.workDate,
      employee: employeeNames.value.get(log.employeeId) ?? log.employeeId,
      checkIn: log.checkIn ?? '',
      checkOut: log.checkOut ?? '',
      method: log.method,
    }))
  }
  if (reportKind.value === 'leave') {
    return filteredLeave.value.map((request: LeaveRequest) => ({
      employee: employeeNames.value.get(request.employeeId) ?? request.employeeId,
      type: leaveTypeNames.value.get(request.leaveTypeId) ?? request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days,
      status: t(`leave.statuses.${request.status}`),
    }))
  }
  return filteredPayroll.value
})
const reportCount = computed(() => filteredRows.value.length)

async function loadReports() {
  loading.value = true
  loadError.value = false
  try {
    const [employeePage, attendancePage, leavePage, leaveTypePage] = await Promise.all([
      api.employees.employees.list(),
      api.attendance.logs.list(),
      api.leave.requests.list(),
      api.leave.types.list(),
    ])
    employees.value = employeePage.items
    attendanceLogs.value = attendancePage.items
    leaveRequests.value = leavePage.items
    leaveTypes.value = leaveTypePage.items
    if (isPayrollAllowed.value) {
      const [periodPage, runPage, payslipPage] = await Promise.all([
        api.payroll.periods.list(),
        api.payroll.runs.list(),
        api.payroll.payslips.list(),
      ])
      payrollPeriods.value = periodPage.items
      payrollRuns.value = runPage.items
      payslips.value = payslipPage.items
    }
  } catch (error) {
    console.error('Could not load report data.', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function selectReport(kind: ReportKind) {
  if (kind === 'payroll' && !isPayrollAllowed.value) return
  reportKind.value = kind
}

function download(format: 'csv' | 'xls') {
  const formatName = format === 'csv' ? t('reports.exportCsv') : t('reports.exportExcel')
  return notify.promise(Promise.resolve().then(() => {
    exportReport(`phkar-hr-${reportKind.value}-${fromDate.value}-${toDate.value}`, format, reportColumns.value, filteredRows.value)
  }), {
    loading: t('toast.exportStarted', { format: formatName }),
    success: t('toast.exportFinished', { format: formatName }),
    error: t('toast.requestFailed'),
    id: `report-export:${format}:${reportKind.value}`,
  })
}

const { pending: pagePending } = await useAsyncData('reports-page-data', async () => { await loadReports(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !loadError.value && (loading.value || pagePending.value)))
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">{{ t('reports.title') }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('reports.description') }}</p>
    </header>

    <div v-if="showSkeleton && !loadError" class="space-y-6 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-hidden="true">
      <SkeletonFilterBar :filters="4" />
      <div class="p-5"><SkeletonTable :rows="10" :columns="6" /></div>
    </div>
    <div v-else-if="loadError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {{ t('common.loadError') }}
      <button type="button" class="ml-2 font-semibold underline" @click="loadReports">{{ t('common.retry') }}</button>
    </div>
    <template v-else>
      <nav class="flex flex-wrap gap-2" :aria-label="t('reports.sections')">
        <button
          v-for="kind in (['attendance', 'leave', ...(isPayrollAllowed ? ['payroll'] : [])] as ReportKind[])"
          :key="kind"
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :class="reportKind === kind ? '!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''"
          @click="selectReport(kind)"
        >
          {{ t(`reports.tabs.${kind}`) }}
        </button>
      </nav>

      <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>{{ t('reports.from') }}</span>
            <input v-model="fromDate" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
          </label>
          <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>{{ t('reports.to') }}</span>
            <input v-model="toDate" type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
          </label>
          <label class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>{{ t('reports.employee') }}</span>
            <AppSelect
              v-model="employeeId"
              :options="employees.map((employee: Employee) => ({ label: `${employee.firstName} ${employee.lastName}`, value: employee.id }))"
              :placeholder="t('reports.allEmployees')"
              clearable
            />
          </label>
          <div class="flex items-end gap-2">
            <button type="button" :disabled="!filteredRows.length || !validDateRange" class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" @click="download('csv')">{{ t('reports.exportCsv') }}</button>
            <button type="button" :disabled="!filteredRows.length || !validDateRange" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" @click="download('xls')">{{ t('reports.exportExcel') }}</button>
          </div>
        </div>
        <p v-if="!validDateRange" class="mt-3 text-sm text-red-600 dark:text-red-300">{{ t('reports.invalidDateRange') }}</p>
        <p v-else class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ t('reports.records', { count: reportCount }) }}</p>

        <div v-if="validDateRange && !filteredRows.length" class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">{{ t('reports.noRows') }}</div>
        <div v-else-if="validDateRange" class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="text-slate-500"><tr><th v-for="column in reportColumns" :key="column.key" class="whitespace-nowrap py-2 pr-4">{{ column.label }}</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="(row, index) in filteredRows" :key="String(row.id ?? index)">
                <td v-for="column in reportColumns" :key="column.key" class="whitespace-nowrap py-3 pr-4 text-slate-700 dark:text-slate-200">{{ row[column.key] ?? '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
