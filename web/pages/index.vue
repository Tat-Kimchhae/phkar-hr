<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  Contract,
  Employee,
  EmployeeDocument,
  Holiday,
  LeaveType,
  Notification,
} from '~/types'
import type { AttendanceDaySummary } from '~/composables/useAttendance'
import type { ChartData, ChartOptions } from 'chart.js'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'
import DashboardStatCard from '~/components/dashboard/DashboardStatCard.vue'
import DashboardTodayCard from '~/components/dashboard/DashboardTodayCard.vue'
import DashboardListCard from '~/components/dashboard/DashboardListCard.vue'
import DashboardSkeleton from '~/components/dashboard/DashboardSkeleton.vue'
import AppAvatar from '~/components/app/AppAvatar.vue'

definePageMeta({
  path: '/dashboard',
})

interface DashboardMetric {
  value: number
  previous: number
  series: number[]
}

interface DashboardCharts {
  attendance: { labels: string[]; onTime: number[]; late: number[]; absent: number[]; onLeave: number[] }
  departmentHeadcount: { labels: string[]; values: number[]; total: number } | null
  leaveDaysByType: Array<{ label: string; value: number }>
  ownLeave: Array<{ label: string; used: number; remaining: number }>
  payroll: Array<{ label: string; gross: number; net: number }>
  hires: Array<{ label: string; value: number }>
  stats: {
    headcount: DashboardMetric
    checkedIn: DashboardMetric
    late: DashboardMetric
    onLeave: DashboardMetric
    pending: DashboardMetric
  }
}

type ApprovalKind = 'leave' | 'correction' | 'overtime'
interface PendingApproval {
  id: string
  employeeId: string
  kind: ApprovalKind
  date: string
  description: string
}

interface ChartLegendItem {
  label: string
  color: string
  visible?: boolean
}

const { t, locale } = useI18n()
const auth = useAuthStore()
const { can } = usePermission()
const api = useHrApi()
const chartsApi = useRestApi<DashboardCharts>('dashboard/charts')
const notify = useNotify()
const loading = ref(true)
const hasLoadedDashboard = ref(false)
const chartsLoading = ref(true)
const chartsError = ref(false)
const chartsInitialized = ref(false)
const loadError = ref(false)
const loadErrorMessage = ref('')
const attendanceRange = ref<7 | 14 | 30>(14)
const chartData = ref<DashboardCharts | null>(null)
const employees = ref<Employee[]>([])
const attendanceSummary = ref<AttendanceDaySummary[]>([])
const expiringRecords = ref<Array<{ id: string; employeeId: string; label: string; date: string }>>([])
const notifications = ref<Notification[]>([])
const approvals = ref<PendingApproval[]>([])
const leaveTypes = ref<LeaveType[]>([])
const upcomingHolidays = ref<Holiday[]>([])
const savingApprovalId = ref('')
const approvalError = ref('')
const day = dayjs().format('YYYY-MM-DD')
const manager = computed(() => auth.user?.role === 'manager')
const financeRole = computed(() => auth.user?.role === 'admin' || auth.user?.role === 'hr')
const canAddEmployee = computed(() => can('employees.manage'))
const canApproveLeave = computed(() => can('leave.manage'))
const canRunPayroll = computed(() => can('payroll.manage'))
const actionCount = computed(() => Number(canAddEmployee.value) + Number(canApproveLeave.value) + Number(canRunPayroll.value))

const copy = computed(() => locale.value === 'km'
  ? {
      greeting: 'សួស្តី',
      addEmployee: 'បន្ថែមបុគ្គលិក',
      approveLeave: 'អនុម័តការឈប់សម្រាក',
      runPayroll: 'ដំណើរការប្រាក់បៀវត្សរ៍',
      today: 'ថ្ងៃនេះ',
      attendanceSubtitle: 'ស្ថានភាពវត្តមានប្រចាំថ្ងៃសម្រាប់ក្រុមរបស់អ្នក',
      currentHeadcount: 'ចំនួនបុគ្គលិកសកម្មតាមនាយកដ្ឋាន',
      leaveSubtitle: 'ថ្ងៃឈប់សម្រាកដែលបានអនុម័តក្នុងឆ្នាំនេះ',
      payrollSubtitle: 'ប្រាក់សរុប និងប្រាក់សុទ្ធតាមរយៈពេលប្រាក់បៀវត្សរ៍',
      holidaysTitle: 'ថ្ងៃឈប់សម្រាកខាងមុខ',
      holidaysSubtitle: 'ថ្ងៃឈប់សម្រាកក្រុមហ៊ុនដែលនឹងមកដល់',
      pendingTitle: 'ការអនុម័តដែលកំពុងរង់ចាំ',
      pendingSubtitle: 'សំណើឈប់សម្រាក កែតម្រូវ និងម៉ោងបន្ថែម',
      expiringTitle: 'ឯកសារ និងកិច្ចសន្យាជិតផុតកំណត់',
      expiringSubtitle: 'ក្នុងរយៈពេល ៣០ ថ្ងៃខាងមុខ',
      notificationSubtitle: 'បច្ចុប្បន្នភាពថ្មីៗសម្រាប់អ្នក',
      viewAll: 'មើលទាំងអស់',
      approve: 'អនុម័ត',
      reject: 'បដិសេធ',
      leave: 'ឈប់សម្រាក',
      correction: 'កែតម្រូវវត្តមាន',
      overtime: 'ម៉ោងបន្ថែម',
      checkInRate: 'អត្រាចូលធ្វើការ',
      checkedIn: 'បានចូលធ្វើការ',
      late: 'មកយឺត',
      absent: 'អវត្តមាន',
      none: 'គ្មាន',
      noPending: 'មិនមានការអនុម័តដែលកំពុងរង់ចាំទេ។',
      noExpiring: 'គ្មានឯកសារ ឬកិច្ចសន្យាជិតផុតកំណត់ទេ។',
      noHolidays: 'មិនមានថ្ងៃឈប់សម្រាកដែលបានកំណត់ទេ។',
      noNotifications: 'មិនមានការជូនដំណឹងថ្មីទេ។',
      daysLeft: (days: number) => `នៅសល់ ${new Intl.NumberFormat('km-KH').format(days)} ថ្ងៃ`,
      hours: (hours: number) => `${new Intl.NumberFormat('km-KH').format(hours)} ម៉ោង`,
      day: 'ថ្ងៃ',
      days: 'ថ្ងៃ',
      todayRate: 'អត្រាចូលធ្វើការថ្ងៃនេះ',
      noTrend: 'មិនមានទិន្នន័យគំនូសតាងទេ។',
    }
  : {
      greeting: 'Good morning',
      addEmployee: 'Add employee',
      approveLeave: 'Approve leave',
      runPayroll: 'Run payroll',
      today: 'Today',
      attendanceSubtitle: 'Daily attendance status across your team',
      currentHeadcount: 'Active employees across departments',
      leaveSubtitle: 'Approved leave days this year',
      payrollSubtitle: 'Gross and net totals by payroll period',
      holidaysTitle: 'Upcoming holidays',
      holidaysSubtitle: 'Company holidays coming up',
      pendingTitle: 'Pending approvals',
      pendingSubtitle: 'Leave, attendance corrections, and overtime',
      expiringTitle: 'Expiring documents and contracts',
      expiringSubtitle: 'Coming up in the next 30 days',
      notificationSubtitle: 'The latest updates for you',
      viewAll: 'View all',
      approve: 'Approve',
      reject: 'Reject',
      leave: 'Leave',
      correction: 'Correction',
      overtime: 'Overtime',
      checkInRate: 'check-in rate',
      checkedIn: 'checked in',
      late: 'Late',
      absent: 'Absent',
      none: 'None',
      noPending: 'There are no pending approvals.',
      noExpiring: 'No documents or contracts are close to expiry.',
      noHolidays: 'No upcoming holidays are scheduled.',
      noNotifications: 'There are no recent notifications.',
      daysLeft: (days: number) => `${days} days left`,
      hours: (hours: number) => `${hours} hours`,
      day: 'day',
      days: 'days',
      todayRate: "Today's check-in rate",
      noTrend: 'No chart data is available.',
    })

const chartTheme = ref({
  onTime: '#16a34a',
  late: '#d97706',
  absent: '#dc2626',
  onLeave: '#6366f1',
  categories: ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#059669'],
  text: '#64748b',
  grid: 'rgba(100, 116, 139, .13)',
  card: '#ffffff',
  font: "Inter, 'Noto Sans Khmer', sans-serif",
})
let themeObserver: MutationObserver | undefined

function readChartTheme() {
  if (!import.meta.client) return
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  chartTheme.value = {
    onTime: token('--chart-on-time', '#16a34a'),
    late: token('--chart-late', '#d97706'),
    absent: token('--chart-absent', '#dc2626'),
    onLeave: token('--chart-on-leave', '#6366f1'),
    categories: Array.from({ length: 6 }, (_, index) => token(`--chart-category-${index + 1}`, '#2563eb')),
    text: token('--dashboard-muted', '#64748b'),
    grid: token('--dashboard-grid', 'rgba(100, 116, 139, .13)'),
    card: token('--dashboard-card', '#ffffff'),
    font: getComputedStyle(document.body).fontFamily,
  }
}

const khmerWeekdays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍']
const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']
const toKhmerDigits = (value: number) => String(value).replace(/\d/g, digit => '០១២៣៤៥៦៧៨៩'[Number(digit)]!)
const dateLabel = computed(() => {
  const date = new Date(`${day}T12:00:00Z`)
  if (locale.value === 'km') {
    return `ថ្ងៃ${khmerWeekdays[date.getDay()]} ទី${toKhmerDigits(date.getDate())} ខែ${khmerMonths[date.getMonth()]} ឆ្នាំ${toKhmerDigits(date.getFullYear())}`
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Phnom_Penh',
  }).format(date)
})
const greetingName = computed(() => {
  const user = auth.user
  if (!user) return ''
  return locale.value === 'km' && user.employeeId
    ? employeeDisplayName(employeeById(user.employeeId))
    : user.name
})

const eligibleAttendance = computed(() => attendanceSummary.value.filter(item => ['on_time', 'late', 'absent'].includes(item.status)).length)
const checkedInToday = computed(() => attendanceSummary.value.filter(item => ['on_time', 'late'].includes(item.status)).length)
const lateToday = computed(() => attendanceSummary.value.filter(item => item.status === 'late'))
const absentToday = computed(() => attendanceSummary.value.filter(item => item.status === 'absent'))
const employeeById = (id: string) => employees.value.find(employee => employee.id === id) ?? null
function employeeDisplayName(employee: Employee | null) {
  if (!employee) return t('common.notSet')
  if (locale.value === 'km' && (employee.firstNameKh || employee.lastNameKh)) {
    return [employee.firstNameKh, employee.lastNameKh].filter(Boolean).join(' ')
  }
  return `${employee.firstName} ${employee.lastName}`
}
const formatNumber = computed(() => new Intl.NumberFormat(locale.value === 'km' ? 'km-KH' : 'en-US'))
function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  if (locale.value === 'km') return `${toKhmerDigits(date.getUTCDate())} ${khmerMonths[date.getUTCMonth()]}`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}
function formatChartDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  if (locale.value === 'km') return `${toKhmerDigits(date.getUTCDate())} ${khmerMonths[date.getUTCMonth()]}`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}
function formatPayrollPeriod(value: string) {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7)) - 1
  if (locale.value === 'km') return `${khmerMonths[month]} ${toKhmerDigits(year % 100)}`
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`))
}

const statCards = computed(() => {
  const stats = chartData.value?.stats
  const fallbackMetric = (value: number): DashboardMetric => ({ value, previous: value, series: [] })
  const activeCount = employees.value.filter(employee => employee.status === 'active').length
  return [
    { key: 'headcount', label: t('dashboard.headcount'), metric: stats?.headcount ?? fallbackMetric(activeCount), accent: 'blue' as const, icon: 'users' as const, to: '/employees' },
    { key: 'checkedIn', label: t('dashboard.checkedIn'), metric: stats?.checkedIn ?? fallbackMetric(checkedInToday.value), accent: 'green' as const, icon: 'check' as const, to: '/attendance' },
    { key: 'late', label: t('dashboard.late'), metric: stats?.late ?? fallbackMetric(lateToday.value.length), accent: 'amber' as const, icon: 'clock' as const, to: '/attendance' },
    { key: 'onLeave', label: t('dashboard.onLeave'), metric: stats?.onLeave ?? fallbackMetric(attendanceSummary.value.filter(item => item.status === 'on_leave').length), accent: 'violet' as const, icon: 'leave' as const, to: '/leave' },
    { key: 'pending', label: t('dashboard.pendingApprovals'), metric: stats?.pending ?? fallbackMetric(approvals.value.length), accent: 'rose' as const, icon: 'inbox' as const, to: can('leave.manage') ? '/leave' : '/attendance' },
  ]
})

const chartLocale = computed(() => locale.value === 'km' ? 'km-KH' : 'en-US')
const attendanceVisible = ref([true, true, true, true])
const payrollVisible = ref([true, true])
const leaveVisible = ref(true)
const attendanceLegend = computed<ChartLegendItem[]>(() => [
  { label: t('dashboard.charts.onTime'), color: chartTheme.value.onTime, visible: attendanceVisible.value[0] },
  { label: t('dashboard.charts.late'), color: chartTheme.value.late, visible: attendanceVisible.value[1] },
  { label: t('dashboard.charts.absent'), color: chartTheme.value.absent, visible: attendanceVisible.value[2] },
  { label: t('dashboard.charts.onLeave'), color: chartTheme.value.onLeave, visible: attendanceVisible.value[3] },
])
const payrollLegend = computed<ChartLegendItem[]>(() => [
  { label: t('dashboard.charts.gross'), color: chartTheme.value.categories[0]!, visible: payrollVisible.value[0] },
  { label: t('dashboard.charts.net'), color: chartTheme.value.categories[1]!, visible: payrollVisible.value[1] },
])
function toggleVisibility(group: 'attendance' | 'payroll', index: number) {
  if (group === 'attendance') {
    attendanceVisible.value = attendanceVisible.value.map((visible, item) => item === index ? !visible : visible)
  } else {
    payrollVisible.value = payrollVisible.value.map((visible, item) => item === index ? !visible : visible)
  }
}

const attendanceData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: (chartData.value?.attendance.labels ?? []).map(formatChartDate),
  datasets: [
    { label: t('dashboard.charts.onTime'), data: chartData.value?.attendance.onTime ?? [], backgroundColor: chartTheme.value.onTime, borderColor: chartTheme.value.card, borderWidth: 2, borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 }, hidden: !attendanceVisible.value[0] },
    { label: t('dashboard.charts.late'), data: chartData.value?.attendance.late ?? [], backgroundColor: chartTheme.value.late, borderColor: chartTheme.value.card, borderWidth: 2, borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 }, hidden: !attendanceVisible.value[1] },
    { label: t('dashboard.charts.absent'), data: chartData.value?.attendance.absent ?? [], backgroundColor: chartTheme.value.absent, borderColor: chartTheme.value.card, borderWidth: 2, borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 }, hidden: !attendanceVisible.value[2] },
    { label: t('dashboard.charts.onLeave'), data: chartData.value?.attendance.onLeave ?? [], backgroundColor: chartTheme.value.onLeave, borderColor: chartTheme.value.card, borderWidth: 2, borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 }, hidden: !attendanceVisible.value[3] },
  ],
}))
const attendanceOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  locale: chartLocale.value,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.dataset.label ?? ''}: ${formatNumber.value.format(Number(context.raw))}` } } },
  scales: {
    x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: chartTheme.value.grid, borderDash: [4, 4] }, border: { display: false } },
  },
}))

const departmentData = computed<ChartData<'doughnut', number[], string>>(() => ({
  labels: (chartData.value?.departmentHeadcount?.labels ?? []).map(label => t(`dashboard.charts.departmentsByName.${label.toLowerCase()}`, label)),
  datasets: [{
    data: chartData.value?.departmentHeadcount?.values ?? [],
    backgroundColor: chartTheme.value.categories.slice(0, chartData.value?.departmentHeadcount?.values.length ?? 0),
    borderColor: chartTheme.value.card,
    borderWidth: 3,
    borderRadius: 7,
    spacing: 3,
  }],
}))
const donutOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  locale: chartLocale.value,
  cutout: '74%',
  plugins: { legend: { display: false } },
}))

const leaveData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: (chartData.value?.leaveDaysByType ?? []).map(item => t(`dashboard.charts.leaveTypes.${item.label.toLowerCase()}`, item.label)),
  datasets: [{ label: t('dashboard.charts.days'), data: (chartData.value?.leaveDaysByType ?? []).map(item => item.value), backgroundColor: chartTheme.value.categories[2], borderRadius: 8, borderSkipped: false, hidden: !leaveVisible.value }],
}))
const leaveOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  locale: chartLocale.value,
  layout: { padding: { right: 28 } },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${t('dashboard.charts.days')}: ${formatNumber.value.format(Number(context.raw))}` } } },
  scales: {
    x: { display: false, beginAtZero: true, grid: { display: false }, border: { display: false } },
    y: { grid: { display: false }, border: { display: false }, ticks: { color: chartTheme.value.text } },
  },
}))

const payrollData = computed<ChartData<'line', number[], string>>(() => ({
  labels: (chartData.value?.payroll ?? []).map(item => formatPayrollPeriod(item.label)),
  datasets: [
    { label: t('dashboard.charts.gross'), data: chartData.value?.payroll.map(item => item.gross) ?? [], borderColor: chartTheme.value.categories[0], fill: true, hidden: !payrollVisible.value[0] },
    { label: t('dashboard.charts.net'), data: chartData.value?.payroll.map(item => item.net) ?? [], borderColor: chartTheme.value.categories[1], fill: true, hidden: !payrollVisible.value[1] },
  ],
}))
const payrollOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  locale: chartLocale.value,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.dataset.label ?? ''}: $${formatNumber.value.format(Number(context.raw))}` } } },
  scales: {
    x: { grid: { display: false }, border: { display: false } },
    y: { beginAtZero: true, grid: { color: chartTheme.value.grid, borderDash: [4, 4] }, border: { display: false }, ticks: { callback: value => `$${formatNumber.value.format(Number(value))}` } },
  },
}))

function isChartEmpty() {
  const attendance = chartData.value?.attendance
  return !attendance?.labels.length || !attendance.labels.some((_value, index) =>
    attendance.onTime[index]! + attendance.late[index]! + attendance.absent[index]! + attendance.onLeave[index]! > 0,
  )
}

function approvalLabel(kind: ApprovalKind) {
  return kind === 'leave' ? copy.value.leave : kind === 'correction' ? copy.value.correction : copy.value.overtime
}

function expiryDays(date: string) {
  return dayjs(date).startOf('day').diff(dayjs(day).startOf('day'), 'day')
}

async function refreshCharts() {
  chartsLoading.value = true
  chartsError.value = false
  try {
    chartData.value = await chartsApi.fetch<DashboardCharts>({ days: attendanceRange.value })
  } catch (error) {
    console.error('Could not load dashboard charts.', error)
    chartsError.value = true
  } finally {
    chartsLoading.value = false
    chartsInitialized.value = true
  }
}

async function loadDashboard() {
  if (!hasLoadedDashboard.value || loadError.value) loading.value = true
  loadError.value = false
  loadErrorMessage.value = ''
  try {
    const [
      employeePage,
      attendancePage,
      leavePage,
      documentPage,
      contractPage,
      notificationPage,
      holidayPage,
      typePage,
    ] = await Promise.all([
      api.employees.employees.list({ pageSize: 100 }),
      api.attendance.summary.list({ filters: { date: day }, pageSize: 100 }),
      api.leave.requests.list({ filter: { status: 'pending' }, sortBy: 'createdAt', sortDirection: 'desc', pageSize: 100 }),
      api.employees.documents.list({ pageSize: 100 }),
      api.employees.contracts.list({ pageSize: 100 }),
      api.notifications.notifications.list({ sortBy: 'createdAt', sortDirection: 'desc', limit: 5 }),
      api.organization.holidays.list({ pageSize: 100 }),
      api.leave.types.list({ pageSize: 100 }),
    ])
    employees.value = employeePage.items
    attendanceSummary.value = attendancePage.items
    notifications.value = notificationPage.items
    leaveTypes.value = typePage.items
    upcomingHolidays.value = holidayPage.items
      .filter(holiday => holiday.holidayDate >= day)
      .sort((left, right) => left.holidayDate.localeCompare(right.holidayDate))
      .slice(0, 5)

    const approvalRows: PendingApproval[] = []
    if (canApproveLeave.value) {
      for (const request of leavePage.items) {
        if (manager.value && request.employeeId === auth.user?.employeeId) continue
        const leaveType = leaveTypes.value.find(type => type.id === request.leaveTypeId)?.name ?? copy.value.leave
        approvalRows.push({
          id: request.id,
          employeeId: request.employeeId,
          kind: 'leave',
          date: request.startDate,
          description: `${t(`dashboard.charts.leaveTypes.${leaveType.toLowerCase()}`, leaveType)} · ${formatNumber.value.format(request.days)} ${request.days === 1 ? copy.value.day : copy.value.days}`,
        })
      }
    }
    if (can('attendance.manage')) {
      const [correctionPage, overtimePage] = await Promise.all([
        api.attendance.corrections.list({ filter: { status: 'pending' }, sortBy: 'createdAt', sortDirection: 'desc', pageSize: 100 }),
        api.attendance.overtime.list({ filter: { status: 'pending' }, sortBy: 'workDate', sortDirection: 'desc', pageSize: 100 }),
      ])
      for (const record of correctionPage.items) {
        if (manager.value && record.employeeId === auth.user?.employeeId) continue
        approvalRows.push({
          id: record.id,
          employeeId: record.employeeId,
          kind: 'correction',
          date: record.workDate,
          description: record.reason,
        })
      }
      for (const record of overtimePage.items) {
        if (manager.value && record.employeeId === auth.user?.employeeId) continue
        approvalRows.push({
          id: record.id,
          employeeId: record.employeeId,
          kind: 'overtime',
          date: record.workDate,
          description: copy.value.hours(record.hours),
        })
      }
    }
    approvals.value = approvalRows.sort((left, right) => right.date.localeCompare(left.date))

    const start = dayjs(day).startOf('day')
    const end = start.add(30, 'day').endOf('day')
    expiringRecords.value = [
      ...documentPage.items
        .filter((document: EmployeeDocument) => document.expiryDate && dayjs(document.expiryDate).isValid()
          && !dayjs(document.expiryDate).isBefore(start) && !dayjs(document.expiryDate).isAfter(end))
        .map(document => ({ id: `document-${document.id}`, employeeId: document.employeeId, label: t('dashboard.document'), date: document.expiryDate! })),
      ...contractPage.items
        .filter((contract: Contract) => contract.status === 'active' && contract.endDate && dayjs(contract.endDate).isValid()
          && !dayjs(contract.endDate).isBefore(start) && !dayjs(contract.endDate).isAfter(end))
        .map(contract => ({ id: `contract-${contract.id}`, employeeId: contract.employeeId, label: t('dashboard.contract'), date: contract.endDate! })),
    ].sort((left, right) => left.date.localeCompare(right.date)).slice(0, 5)

    void refreshCharts()
  } catch (error) {
    console.error('Could not load dashboard data.', error)
    loadError.value = true
    loadErrorMessage.value = error instanceof Error ? error.message : t('common.loadError')
  } finally {
    loading.value = false
    hasLoadedDashboard.value = true
  }
}

async function reviewApproval(approval: PendingApproval, decision: 'approve' | 'reject') {
  if (savingApprovalId.value) return
  savingApprovalId.value = approval.id
  approvalError.value = ''
  try {
    if (approval.kind === 'leave') {
      if (decision === 'approve') await api.leave.approve(approval.id)
      else await api.leave.reject(approval.id, '')
      notify.success(t(decision === 'approve' ? 'toast.leaveApproved' : 'toast.leaveRejected'), undefined, `dashboard-approval:${approval.id}`)
    } else if (approval.kind === 'correction') {
      if (decision === 'approve') await api.attendance.approveCorrection(approval.id)
      else await api.attendance.rejectCorrection(approval.id, '')
      notify.success(t(decision === 'approve' ? 'toast.correctionApproved' : 'toast.correctionRejected'), undefined, `dashboard-approval:${approval.id}`)
    } else {
      if (decision === 'approve') await api.attendance.approveOvertime(approval.id)
      else await api.attendance.rejectOvertime(approval.id, '')
      notify.success(t(decision === 'approve' ? 'toast.overtimeApproved' : 'toast.overtimeRejected'), undefined, `dashboard-approval:${approval.id}`)
    }
    await loadDashboard()
  } catch (error) {
    console.error('Could not update dashboard approval.', error)
    approvalError.value = error instanceof Error ? error.message : t('common.saveError')
  } finally {
    savingApprovalId.value = ''
  }
}

const { pending: pagePending } = await useAsyncData('dashboard-page-data', async () => {
  await loadDashboard()
  return true
}, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !loadError.value && (loading.value || pagePending.value || !chartsInitialized.value)))
watch(attendanceRange, refreshCharts)
onMounted(() => {
  document.documentElement.lang = locale.value
  readChartTheme()
  themeObserver = new MutationObserver(readChartTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
watch(locale, value => {
  if (import.meta.client) document.documentElement.lang = value
})
onBeforeUnmount(() => themeObserver?.disconnect())
</script>

<template>
  <div class="dashboard-page space-y-6">
    <DashboardSkeleton v-if="showSkeleton && !loadError" :action-count="actionCount" />
    <div v-else-if="loadError" role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <p>{{ loadErrorMessage || t('common.loadError') }}</p>
        <button type="button" class="mt-2 font-semibold underline" @click="loadDashboard">{{ t('common.retry') }}</button>
      </div>
    <div v-else class="space-y-6">
        <header class="flex flex-wrap items-end justify-between gap-5">
          <div class="min-w-0">
            <p class="text-sm font-medium text-primary-700 dark:text-primary-300">{{ copy.greeting }}<span v-if="greetingName">, {{ greetingName }}</span></p>
            <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('dashboard.title') }}</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ dateLabel }}</p>
          </div>
          <nav v-if="actionCount" class="flex flex-wrap gap-2" :aria-label="t('dashboard.title')">
            <NuxtLink v-if="canAddEmployee" to="/employees/new" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              <span aria-hidden="true">+</span>{{ copy.addEmployee }}
            </NuxtLink>
            <NuxtLink v-if="canApproveLeave" to="/leave" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
              {{ copy.approveLeave }}
            </NuxtLink>
            <NuxtLink v-if="canRunPayroll" to="/payroll" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-card)] px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
              {{ copy.runPayroll }}
            </NuxtLink>
          </nav>
        </header>

        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5" :aria-label="t('dashboard.metrics')">
          <DashboardStatCard
            v-for="card in statCards"
            :key="card.key"
            :label="card.label"
            :value="card.metric?.value ?? 0"
            :previous="card.metric?.previous ?? 0"
            :series="card.metric?.series ?? []"
            :accent="card.accent"
            :icon="card.icon"
            :to="card.to"
          />
        </section>

        <section class="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-12" :aria-label="t('dashboard.charts.section')">
          <ChartsAppChartCard
            class="md:col-span-1 xl:col-span-8"
            :title="t('dashboard.charts.attendance', { days: attendanceRange })"
            :subtitle="copy.attendanceSubtitle"
            :range="String(attendanceRange)"
            :ranges="[{ label: t('dashboard.charts.days7'), value: '7' }, { label: t('dashboard.charts.days14'), value: '14' }, { label: t('dashboard.charts.days30'), value: '30' }]"
            @update:range="attendanceRange = Number($event) as 7 | 14 | 30"
          >
            <ChartsChartSkeleton v-if="chartsLoading" />
            <ChartsChartEmpty v-else-if="chartsError" :message="t('common.loadError')" :retry-label="t('common.retry')" @retry="refreshCharts" />
            <ChartsChartEmpty v-else-if="isChartEmpty()" :message="t('dashboard.charts.noAttendance')" />
            <div v-else class="flex min-h-[230px] flex-1 flex-col">
              <ChartsChartLegend :items="attendanceLegend" @toggle="toggleVisibility('attendance', $event)" />
              <div class="min-h-0 flex-1"><ChartsAttendanceChart :data="attendanceData" :options="attendanceOptions" /></div>
            </div>
          </ChartsAppChartCard>

          <DashboardTodayCard
            class="md:col-span-1 xl:col-span-4"
            :title="copy.today"
            :checked-in="checkedInToday"
            :eligible="eligibleAttendance"
            :late="lateToday"
            :absent="absentToday"
            :late-label="copy.late"
            :absent-label="copy.absent"
            :empty-label="copy.none"
            :checked-in-summary="copy.checkedIn"
            :rate-label="copy.checkInRate"
          />
        </section>

        <section class="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ChartsAppChartCard
            :title="t('dashboard.charts.departments')"
            :subtitle="copy.currentHeadcount"
          >
            <ChartsChartSkeleton v-if="chartsLoading" />
            <ChartsChartEmpty v-else-if="chartsError" :message="t('common.loadError')" :retry-label="t('common.retry')" @retry="refreshCharts" />
            <ChartsChartEmpty v-else-if="!chartData?.departmentHeadcount?.total" :message="t('dashboard.charts.noHeadcount')" />
            <ChartsDepartmentDonut
              v-else
              :data="departmentData"
              :options="donutOptions"
              :total="chartData.departmentHeadcount.total"
              :center-label="t('dashboard.charts.departments')"
              :locale="chartLocale"
            />
          </ChartsAppChartCard>

          <ChartsAppChartCard
            :title="t('dashboard.charts.leaveDays')"
            :subtitle="copy.leaveSubtitle"
          >
            <ChartsChartSkeleton v-if="chartsLoading" />
            <ChartsChartEmpty v-else-if="chartsError" :message="t('common.loadError')" :retry-label="t('common.retry')" @retry="refreshCharts" />
            <ChartsChartEmpty v-else-if="!chartData?.leaveDaysByType.some(item => item.value > 0)" :message="t('dashboard.charts.noLeave')" />
            <div v-else class="flex min-h-[230px] flex-1 flex-col">
              <ChartsChartLegend :items="[{ label: t('dashboard.charts.days'), color: chartTheme.categories[2] ?? '#0891b2', visible: leaveVisible }]" @toggle="leaveVisible = !leaveVisible" />
              <div class="min-h-0 flex-1"><ChartsLeaveBars :data="leaveData" :options="leaveOptions" /></div>
            </div>
          </ChartsAppChartCard>

          <ChartsAppChartCard
            v-if="financeRole"
            :title="t('dashboard.charts.payroll')"
            :subtitle="copy.payrollSubtitle"
          >
            <ChartsChartSkeleton v-if="chartsLoading" />
            <ChartsChartEmpty v-else-if="chartsError" :message="t('common.loadError')" :retry-label="t('common.retry')" @retry="refreshCharts" />
            <ChartsChartEmpty v-else-if="!chartData?.payroll.length" :message="t('dashboard.charts.noPayroll')" />
            <div v-else class="flex min-h-[230px] flex-1 flex-col">
              <ChartsChartLegend :items="payrollLegend" @toggle="toggleVisibility('payroll', $event)" />
              <div class="min-h-0 flex-1"><ChartsTrendChart :data="payrollData" :options="payrollOptions" /></div>
            </div>
          </ChartsAppChartCard>

          <ChartsAppChartCard
            v-else
            :title="copy.holidaysTitle"
            :subtitle="copy.holidaysSubtitle"
          >
            <ChartsChartSkeleton v-if="loading" />
            <div v-else-if="upcomingHolidays.length" class="flex flex-1 flex-col justify-center">
              <ul class="divide-y divide-slate-100 dark:divide-slate-800">
                <li v-for="holiday in upcomingHolidays" :key="holiday.id" class="flex items-center justify-between gap-3 py-3">
                  <span class="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{{ holiday.name }}</span>
                  <time class="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">{{ formatDate(holiday.holidayDate) }}</time>
                </li>
              </ul>
            </div>
            <ChartsChartEmpty v-else :message="copy.noHolidays" />
          </ChartsAppChartCard>
        </section>

        <section class="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          <DashboardListCard
            :title="copy.pendingTitle"
            :subtitle="copy.pendingSubtitle"
            :view-all-label="copy.viewAll"
            view-all-to="/leave"
            :empty="copy.noPending"
            :is-empty="!approvals.length"
          >
            <p v-if="approvalError" role="alert" class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{{ approvalError }}</p>
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="approval in approvals.slice(0, 5)" :key="`${approval.kind}-${approval.id}`" class="flex min-w-0 items-center gap-3 py-3">
                <AppAvatar :employee="employeeById(approval.employeeId)" size="sm" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{{ employeeDisplayName(employeeById(approval.employeeId)) }}</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ approvalLabel(approval.kind) }} · {{ approval.description }}</p>
                  <time class="text-[11px] text-slate-400">{{ formatDate(approval.date) }}</time>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1">
                  <button type="button" :disabled="Boolean(savingApprovalId)" class="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-300" @click="reviewApproval(approval, 'approve')">{{ savingApprovalId === approval.id ? t('common.saving') : copy.approve }}</button>
                  <button type="button" :disabled="Boolean(savingApprovalId)" class="text-xs font-medium text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-300" @click="reviewApproval(approval, 'reject')">{{ copy.reject }}</button>
                </div>
              </li>
            </ul>
          </DashboardListCard>

          <DashboardListCard
            :title="copy.expiringTitle"
            :subtitle="copy.expiringSubtitle"
            :view-all-label="copy.viewAll"
            view-all-to="/employees"
            :empty="copy.noExpiring"
            :is-empty="!expiringRecords.length"
          >
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="record in expiringRecords.slice(0, 5)" :key="record.id" class="flex min-w-0 items-center gap-3 py-3">
                <AppAvatar :employee="employeeById(record.employeeId)" size="sm" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{{ employeeDisplayName(employeeById(record.employeeId)) }}</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ record.label }}</p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium tabular-nums"
                  :class="expiryDays(record.date) <= 7 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'"
                >
                  {{ copy.daysLeft(expiryDays(record.date)) }}
                </span>
              </li>
            </ul>
          </DashboardListCard>

          <DashboardListCard
            :title="t('dashboard.recentNotifications')"
            :subtitle="copy.notificationSubtitle"
            :view-all-label="copy.viewAll"
            view-all-to="/notifications"
            :empty="copy.noNotifications"
            :is-empty="!notifications.length"
          >
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="notification in notifications.slice(0, 5)" :key="notification.id" class="py-3">
                <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{{ notification.title }}</p>
                <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ notification.body }}</p>
              </li>
            </ul>
          </DashboardListCard>
        </section>
      </div>
  </div>
</template>
