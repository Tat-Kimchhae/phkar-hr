<script setup lang="ts">
import dayjs from 'dayjs'
import type { Employee, LeaveRequest, Notification } from '~/types'
import type { AttendanceDaySummary } from '~/composables/useAttendance'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
import { useDashboardCharts, type DashboardCharts } from '~/composables/useDashboardCharts'
import { useChartTheme } from '~/composables/useChartTheme'
import AppTransition from '~/components/app/AppTransition.vue'
import AppStagger from '~/components/app/AppStagger.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'

definePageMeta({
  path: '/dashboard',
})

const { t } = useI18n()
const auth = useAuthStore()
const { can } = usePermission()
const api = useHrApi()
const { load: loadCharts } = useDashboardCharts()
const loading = ref(true)
const chartsLoading = ref(true)
const attendanceRange = ref<7 | 14 | 30>(14)
const chartData = ref<DashboardCharts | null>(null)
const loadError = ref(false)
const employees = ref<Employee[]>([])
const attendanceSummary = ref<AttendanceDaySummary[]>([])
const expiringRecords = ref<Array<{ id: string; employeeName: string; label: string; date: string }>>([])
const notifications = ref<Notification[]>([])
const pendingApprovals = ref(0)
const day = dayjs().format('YYYY-MM-DD')
const managerOrEmployee = computed(() => auth.user?.role === 'manager' || auth.user?.role === 'employee')
const { locale } = useI18n()
const chartTheme = useChartTheme()
const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: chartTheme.value.text, font: { family: chartTheme.value.font } } }, tooltip: { bodyFont: { family: chartTheme.value.font }, titleFont: { family: chartTheme.value.font }, callbacks: { label: (context: TooltipItem<'bar'>) => `${context.dataset.label ?? ''}: ${context.formattedValue}` } } },
  scales: { x: { stacked: true, ticks: { color: chartTheme.value.text, font: { family: chartTheme.value.font } }, grid: { color: chartTheme.value.grid } }, y: { stacked: true, beginAtZero: true, ticks: { color: chartTheme.value.text, precision: 0, font: { family: chartTheme.value.font } }, grid: { color: chartTheme.value.grid } } },
}))
const attendanceData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: (chartData.value?.attendance.labels ?? []).map((value: string) => new Intl.DateTimeFormat(locale.value === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))),
  datasets: [
    { label: t('dashboard.charts.onTime'), data: chartData.value?.attendance.onTime ?? [], backgroundColor: chartTheme.value.primary, borderRadius: 3 },
    { label: t('dashboard.charts.late'), data: chartData.value?.attendance.late ?? [], backgroundColor: chartTheme.value.secondary, borderRadius: 3 },
    { label: t('dashboard.charts.absent'), data: chartData.value?.attendance.absent ?? [], backgroundColor: chartTheme.value.danger, borderRadius: 3 },
    { label: t('dashboard.charts.onLeave'), data: chartData.value?.attendance.onLeave ?? [], backgroundColor: chartTheme.value.info, borderRadius: 3 },
  ],
}))
const departmentData = computed<ChartData<'doughnut', number[], string>>(() => ({ labels: (chartData.value?.departmentHeadcount?.labels ?? []).map((label: string) => t(`dashboard.charts.departmentsByName.${label.toLowerCase()}`, label)), datasets: [{ data: chartData.value?.departmentHeadcount?.values ?? [], backgroundColor: [chartTheme.value.primary, chartTheme.value.info, chartTheme.value.secondary, chartTheme.value.violet, chartTheme.value.danger], borderColor: chartTheme.value.dark ? '#0f172a' : '#ffffff', borderWidth: 3 }] }))
const donutOptions = computed<ChartOptions<'doughnut'>>(() => ({ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: chartTheme.value.text, font: { family: chartTheme.value.font } } }, tooltip: { bodyFont: { family: chartTheme.value.font }, titleFont: { family: chartTheme.value.font }, callbacks: { label: (context: TooltipItem<'doughnut'>) => `${context.label}: ${context.formattedValue}` } } } }))
const leaveData = computed<ChartData<'bar', number[], string>>(() => ({ labels: chartData.value?.leaveDaysByType.map((item: DashboardCharts['leaveDaysByType'][number]) => t(`dashboard.charts.leaveTypes.${item.label.toLowerCase()}`, item.label)) ?? [], datasets: [{ label: t('dashboard.charts.days'), data: chartData.value?.leaveDaysByType.map((item: DashboardCharts['leaveDaysByType'][number]) => item.value) ?? [], backgroundColor: chartTheme.value.primary, borderRadius: 4 }] }))
const leaveOptions = computed<ChartOptions<'bar'>>(() => ({ ...chartOptions.value, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { color: chartTheme.value.text, precision: 0, font: { family: chartTheme.value.font } }, grid: { color: chartTheme.value.grid } }, y: { ticks: { color: chartTheme.value.text, font: { family: chartTheme.value.font } }, grid: { display: false } } } }))
const ownLeaveData = computed<ChartData<'doughnut', number[], string>>(() => ({ labels: [t('dashboard.charts.used'), t('dashboard.charts.remaining')], datasets: [{ data: [chartData.value?.ownLeave.reduce((sum: number, item: DashboardCharts['ownLeave'][number]) => sum + item.used, 0) ?? 0, chartData.value?.ownLeave.reduce((sum: number, item: DashboardCharts['ownLeave'][number]) => sum + item.remaining, 0) ?? 0], backgroundColor: [chartTheme.value.secondary, chartTheme.value.primary], borderColor: chartTheme.value.dark ? '#0f172a' : '#ffffff', borderWidth: 3 }] }))
const payrollData = computed<ChartData<'line', number[], string>>(() => ({ labels: chartData.value?.payroll.map((item: DashboardCharts['payroll'][number]) => new Intl.DateTimeFormat(locale.value === 'km' ? 'km-KH' : 'en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${item.label}-01T00:00:00Z`))) ?? [], datasets: [{ label: t('dashboard.charts.gross'), data: chartData.value?.payroll.map((item: DashboardCharts['payroll'][number]) => item.gross) ?? [], borderColor: chartTheme.value.info, backgroundColor: chartTheme.value.info, tension: 0.3 }, { label: t('dashboard.charts.net'), data: chartData.value?.payroll.map((item: DashboardCharts['payroll'][number]) => item.net) ?? [], borderColor: chartTheme.value.primary, backgroundColor: chartTheme.value.primary, tension: 0.3 }] }))
const payrollOptions = computed<ChartOptions<'line'>>(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: chartTheme.value.text, font: { family: chartTheme.value.font } } }, tooltip: { bodyFont: { family: chartTheme.value.font }, titleFont: { family: chartTheme.value.font }, callbacks: { label: (context: TooltipItem<'line'>) => `${context.dataset.label ?? ''}: $${Number(context.raw).toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')}` } } }, scales: { x: { ticks: { color: chartTheme.value.text, font: { family: chartTheme.value.font } }, grid: { color: chartTheme.value.grid } }, y: { beginAtZero: true, ticks: { color: chartTheme.value.text, font: { family: chartTheme.value.font }, callback: (value: string | number) => `$${Number(value).toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')}` }, grid: { color: chartTheme.value.grid } } } }))
const hiresData = computed<ChartData<'bar', number[], string>>(() => ({ labels: chartData.value?.hires.map((item: DashboardCharts['hires'][number]) => new Intl.DateTimeFormat(locale.value === 'km' ? 'km-KH' : 'en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${item.label}-01T00:00:00Z`))) ?? [], datasets: [{ label: t('dashboard.charts.newHires'), data: chartData.value?.hires.map((item: DashboardCharts['hires'][number]) => item.value) ?? [], backgroundColor: chartTheme.value.primary, borderRadius: 4 }] }))

async function refreshCharts() {
  chartsLoading.value = true
  try { chartData.value = await loadCharts(attendanceRange.value) }
  catch (error) { console.error('Could not load dashboard charts.', error) }
  finally { chartsLoading.value = false }
}

const metrics = computed(() => {
  const activeEmployees = employees.value.filter((employee: Employee) => employee.status === 'active')
  const activeIds = new Set(activeEmployees.map((employee: Employee) => employee.id))

  return {
    headcount: activeEmployees.length,
    checkedIn: attendanceSummary.value.filter((item: AttendanceDaySummary) => activeIds.has(item.employee.id) && ['on_time', 'late'].includes(item.status)).length,
    late: attendanceSummary.value.filter((item: AttendanceDaySummary) => activeIds.has(item.employee.id) && item.status === 'late').length,
    onLeave: attendanceSummary.value.filter((item: AttendanceDaySummary) => activeIds.has(item.employee.id) && item.status === 'on_leave').length,
    pending: pendingApprovals.value,
  }
})
const cards = computed(() => [
  { label: t('dashboard.headcount'), value: metrics.value.headcount },
  { label: t('dashboard.checkedIn'), value: metrics.value.checkedIn },
  { label: t('dashboard.late'), value: metrics.value.late },
  { label: t('dashboard.onLeave'), value: metrics.value.onLeave },
  { label: t(managerOrEmployee.value ? 'dashboard.myPending' : 'dashboard.pendingApprovals'), value: metrics.value.pending },
])

async function loadDashboard() {
  loading.value = true
  loadError.value = false
  try {
    const [employeePage, attendancePage, leavePage, documentPage, contractPage, notificationPage] = await Promise.all([
      api.employees.employees.list(),
      api.attendance.summary.list({ filters: { date: day } }),
      api.leave.requests.list(),
      api.employees.documents.list(),
      api.employees.contracts.list(),
      api.notifications.notifications.list({ sortBy: 'createdAt', sortDirection: 'desc', limit: 5 }),
    ])
    employees.value = employeePage.items
    attendanceSummary.value = attendancePage.items
    notifications.value = notificationPage.items
    void refreshCharts()
    const teamIds = new Set(employees.value.map((employee: Employee) => employee.id))
    const pendingLeaves = leavePage.items.filter((request: LeaveRequest) => request.status === 'pending')
    if (auth.user?.role === 'manager') {
      const teamLeaves = can('leave.manage')
        ? pendingLeaves.filter(request => request.employeeId !== auth.user?.employeeId && teamIds.has(request.employeeId)).length
        : 0
      if (can('attendance.manage')) {
        const [corrections, overtime] = await Promise.all([
          api.attendance.corrections.list({ filter: { status: 'pending' } }),
          api.attendance.overtime.list({ filter: { status: 'pending' } }),
        ])
        pendingApprovals.value = teamLeaves
          + corrections.items.filter(record => record.employeeId !== auth.user?.employeeId && teamIds.has(record.employeeId)).length
          + overtime.items.filter(record => record.employeeId !== auth.user?.employeeId && teamIds.has(record.employeeId)).length
      } else {
        pendingApprovals.value = teamLeaves
      }
    } else if (auth.user?.role === 'admin' || auth.user?.role === 'hr') {
      const [corrections, overtime] = await Promise.all([
        api.attendance.corrections.list({ filter: { status: 'pending' } }),
        api.attendance.overtime.list({ filter: { status: 'pending' } }),
      ])
      pendingApprovals.value = (can('leave.manage') ? pendingLeaves.length : 0)
        + (can('attendance.manage') ? corrections.total + overtime.total : 0)
    } else {
      const ownCorrections = await api.attendance.corrections.list({
        filter: { employeeId: auth.user?.employeeId ?? '', status: 'pending' },
      })
      pendingApprovals.value = pendingLeaves.filter(request => request.employeeId === auth.user?.employeeId).length
        + ownCorrections.total
    }

    const start = dayjs().startOf('day')
    const end = start.add(30, 'day').endOf('day')
    const employeeName = new Map(employees.value.map((employee: Employee) => [
      employee.id,
      `${employee.firstName} ${employee.lastName}`,
    ]))
    expiringRecords.value = [
      ...documentPage.items
        .filter(document => document.expiryDate && dayjs(document.expiryDate).isValid()
          && !dayjs(document.expiryDate).isBefore(start) && !dayjs(document.expiryDate).isAfter(end))
        .map(document => ({
          id: `document-${document.id}`,
          employeeName: employeeName.get(document.employeeId)
            ?? (document.employeeId === auth.user?.employeeId ? auth.user.name : ''),
          label: t('dashboard.document'),
          date: document.expiryDate!,
        })),
      ...contractPage.items
        .filter(contract => contract.status === 'active' && contract.endDate && dayjs(contract.endDate).isValid()
          && !dayjs(contract.endDate).isBefore(start) && !dayjs(contract.endDate).isAfter(end))
        .map(contract => ({
          id: `contract-${contract.id}`,
          employeeName: employeeName.get(contract.employeeId)
            ?? (contract.employeeId === auth.user?.employeeId ? auth.user.name : ''),
          label: t('dashboard.contract'),
          date: contract.endDate!,
        })),
    ].sort((left, right) => left.date.localeCompare(right.date))

  } catch (error) {
    console.error('Could not load dashboard data.', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

const { pending: pagePending } = await useAsyncData('dashboard-page-data', async () => { await loadDashboard(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !loadError.value && (loading.value || pagePending.value)))
watch(attendanceRange, refreshCharts)
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">{{ t('dashboard.title') }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ dayjs().format('MMMM D, YYYY') }}</p>
    </header>

    <AppTransition name="motion-fade" mode="out-in">
      <div v-if="showSkeleton && !loadError" key="dashboard-loading" class="space-y-6" aria-hidden="true">
        <SkeletonStats />
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart class="lg:col-span-2" />
          <SkeletonChart />
          <SkeletonChart v-if="auth.user?.role !== 'employee'" />
          <template v-if="auth.user?.role === 'admin' || auth.user?.role === 'hr'">
            <SkeletonChart />
            <SkeletonChart />
          </template>
        </div>
      </div>
      <div v-else-if="loadError" key="dashboard-error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {{ t('common.loadError') }}
        <button type="button" class="ml-2 font-semibold underline" @click="loadDashboard">{{ t('common.retry') }}</button>
      </div>
      <div v-else key="dashboard-content" class="space-y-6">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" :aria-label="t('dashboard.metrics')">
        <article v-for="card in cards" :key="card.label" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ card.label }}</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white"><AppCountUp :value="card.value" /></p>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 lg:grid-cols-2" :aria-label="t('dashboard.charts.section')">
        <ChartsAppChartCard class="lg:col-span-2" :title="t('dashboard.charts.attendance', { days: attendanceRange })" :range="String(attendanceRange)" :ranges="[{ label: t('dashboard.charts.days7'), value: '7' }, { label: t('dashboard.charts.days14'), value: '14' }, { label: t('dashboard.charts.days30'), value: '30' }]" @update:range="attendanceRange = Number($event) as 7 | 14 | 30">
          <AppTransition name="motion-fade" mode="out-in">
            <ChartsChartSkeleton v-if="chartsLoading" key="attendance-skeleton" />
            <ChartsChartEmpty v-else-if="!chartData?.attendance.labels.length || !chartData.attendance.labels.some((_value: string, index: number) => chartData!.attendance.onTime[index]! + chartData!.attendance.late[index]! + chartData!.attendance.absent[index]! + chartData!.attendance.onLeave[index]! > 0)" key="attendance-empty" :message="t('dashboard.charts.noAttendance')" />
            <div v-else key="attendance-content" class="h-72"><ChartsAttendanceChart :data="attendanceData" :options="chartOptions" /></div>
          </AppTransition>
        </ChartsAppChartCard>

        <ChartsAppChartCard v-if="auth.user?.role === 'employee'" :title="t('dashboard.charts.myLeave')">
          <AppTransition name="motion-fade" mode="out-in">
            <ChartsChartSkeleton v-if="chartsLoading" key="own-leave-skeleton" />
            <ChartsChartEmpty v-else-if="!chartData?.ownLeave.length || ownLeaveData.datasets[0]?.data.every((value: number) => value === 0)" key="own-leave-empty" :message="t('dashboard.charts.noLeave')" />
            <ChartsDepartmentDonut v-else key="own-leave-content" :data="ownLeaveData" :options="donutOptions" :total="ownLeaveData.datasets[0]?.data.reduce((sum: number, value: number) => sum + value, 0) ?? 0" />
          </AppTransition>
        </ChartsAppChartCard>

        <ChartsAppChartCard v-else :title="t('dashboard.charts.departments')">
          <AppTransition name="motion-fade" mode="out-in">
            <ChartsChartSkeleton v-if="chartsLoading" key="department-skeleton" />
            <ChartsChartEmpty v-else-if="!chartData?.departmentHeadcount?.total" key="department-empty" :message="t('dashboard.charts.noHeadcount')" />
            <ChartsDepartmentDonut v-else key="department-content" :data="departmentData" :options="donutOptions" :total="chartData.departmentHeadcount.total" />
          </AppTransition>
        </ChartsAppChartCard>

        <ChartsAppChartCard v-if="auth.user?.role !== 'employee'" :title="t('dashboard.charts.leaveDays')">
          <AppTransition name="motion-fade" mode="out-in">
            <ChartsChartSkeleton v-if="chartsLoading" key="leave-skeleton" />
            <ChartsChartEmpty v-else-if="!chartData?.leaveDaysByType.some((item: DashboardCharts['leaveDaysByType'][number]) => item.value > 0)" key="leave-empty" :message="t('dashboard.charts.noLeave')" />
            <div v-else key="leave-content" class="h-64"><ChartsLeaveBars :data="leaveData" :options="leaveOptions" /></div>
          </AppTransition>
        </ChartsAppChartCard>

        <template v-if="auth.user?.role === 'admin' || auth.user?.role === 'hr'">
          <ChartsAppChartCard :title="t('dashboard.charts.payroll')">
            <AppTransition name="motion-fade" mode="out-in">
              <ChartsChartSkeleton v-if="chartsLoading" key="payroll-skeleton" />
              <ChartsChartEmpty v-else-if="!chartData?.payroll.length" key="payroll-empty" :message="t('dashboard.charts.noPayroll')" />
              <div v-else key="payroll-content" class="h-64"><ChartsTrendChart :data="payrollData" :options="payrollOptions" /></div>
            </AppTransition>
          </ChartsAppChartCard>
          <ChartsAppChartCard :title="t('dashboard.charts.newHires')">
            <AppTransition name="motion-fade" mode="out-in">
              <ChartsChartSkeleton v-if="chartsLoading" key="hires-skeleton" />
              <ChartsChartEmpty v-else-if="!chartData?.hires.some((item: DashboardCharts['hires'][number]) => item.value > 0)" key="hires-empty" :message="t('dashboard.charts.noHires')" />
              <div v-else key="hires-content" class="h-64"><ChartsLeaveBars :data="hiresData" :options="leaveOptions" /></div>
            </AppTransition>
          </ChartsAppChartCard>
        </template>
      </section>

      <div class="grid gap-6 xl:grid-cols-2">
        <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.expiring') }}</h2>
          <p v-if="!expiringRecords.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.noExpiring') }}</p>
          <AppStagger v-else tag="ul" class="motion-stagger mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="record in expiringRecords" :key="record.id" class="flex items-center justify-between gap-3 py-3 text-sm">
              <span class="text-slate-700 dark:text-slate-200">{{ record.employeeName }} · {{ record.label }}</span>
              <time class="shrink-0 text-slate-500 dark:text-slate-400">{{ record.date }}</time>
            </li>
          </AppStagger>
        </section>
        <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.recentNotifications') }}</h2>
          <p v-if="!notifications.length" class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ t('topbar.noNotifications') }}</p>
          <AppStagger v-else tag="ul" class="motion-stagger mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="notification in notifications" :key="notification.id" class="py-3">
              <NuxtLink v-if="notification.link" :to="notification.link" class="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                {{ notification.title }}
              </NuxtLink>
              <p v-else class="font-medium text-slate-800 dark:text-slate-100">{{ notification.title }}</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ notification.message }}</p>
            </li>
          </AppStagger>
        </section>
      </div>
      </div>
    </AppTransition>
  </div>
</template>
