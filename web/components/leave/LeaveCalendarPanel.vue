<script setup lang="ts">
import dayjs, { type Dayjs } from 'dayjs'
import type { Employee, Holiday, LeaveRequest, LeaveType } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'

const props = defineProps<{
  mode: 'holidays' | 'leaveCalendar'
}>()

const { locale, t } = useI18n()
const api = useHrApi()
const currentMonth = ref(dayjs().startOf('month'))
const holidays = ref<Holiday[]>([])
const approvedRequests = ref<LeaveRequest[]>([])
const employees = ref<Employee[]>([])
const types = ref<LeaveType[]>([])
const loading = ref(true)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))

const weekdays = computed(() => [
  t('leave.weekdays.mon'),
  t('leave.weekdays.tue'),
  t('leave.weekdays.wed'),
  t('leave.weekdays.thu'),
  t('leave.weekdays.fri'),
  t('leave.weekdays.sat'),
  t('leave.weekdays.sun'),
])
const displayedMonth = computed(() => new Intl.DateTimeFormat(
  locale.value === 'km' ? 'km-KH' : 'en-US',
  { month: 'long', year: 'numeric' },
).format(currentMonth.value.toDate()))
const calendarDays = computed<Dayjs[]>(() => {
  const firstDay = currentMonth.value.startOf('month')
  const mondayOffset = (firstDay.day() + 6) % 7
  const gridStart = firstDay.subtract(mondayOffset, 'day')
  return Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [holidayPage, requestPage, employeePage, typePage] = await Promise.all([
      api.organization.holidays.list({ sortBy: 'date' }),
      api.leave.requests.list({ filter: { status: 'approved' } }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
      api.leave.types.list(),
    ])
    holidays.value = holidayPage.items
    approvedRequests.value = requestPage.items
    employees.value = employeePage.items
    types.value = typePage.items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function eventsForDay(day: Dayjs): Array<{ id: string; label: string; kind: 'holiday' | 'leave' }> {
  const date = day.format('YYYY-MM-DD')
  const events: Array<{ id: string; label: string; kind: 'holiday' | 'leave' }> = []
  for (const holiday of holidays.value) {
    if (holiday.date === date) events.push({ id: holiday.id, label: holiday.name, kind: 'holiday' })
  }
  if (props.mode === 'leaveCalendar') {
    for (const request of approvedRequests.value) {
      if (date < request.startDate || date > request.endDate) continue
      const employee = employees.value.find((item: Employee) => item.id === request.employeeId)
      const type = types.value.find((item: LeaveType) => item.id === request.leaveTypeId)
      if (!employee) continue
      const name = `${employee.firstName} ${employee.lastName}`
      const halfDay = request.halfDayPeriod ? ` · ${t(`leave.${request.halfDayPeriod}`)}` : ''
      events.push({
        id: request.id,
        label: `${name} · ${type?.name ?? t('leave.leaveType')}${halfDay}`,
        kind: 'leave',
      })
    }
  }
  return events
}

function moveMonth(amount: number) {
  currentMonth.value = currentMonth.value.add(amount, 'month')
}

onMounted(load)
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
      <div>
        <h2 class="text-lg font-semibold">{{ t(props.mode === 'holidays' ? 'leave.holidayCalendar' : 'leave.leaveCalendar') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t(props.mode === 'holidays' ? 'leave.holidaysHelp' : 'leave.leaveCalendarHelp') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" :aria-label="t('leave.previousMonth')" @click="moveMonth(-1)">←</button>
        <h3 class="min-w-36 text-center font-semibold">{{ displayedMonth }}</h3>
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" :aria-label="t('leave.nextMonth')" @click="moveMonth(1)">→</button>
      </div>
    </header>

    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="6" :columns="7" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else class="overflow-x-auto p-3 sm:p-5">
      <div class="min-w-[700px]">
        <div class="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          <div v-for="weekday in weekdays" :key="weekday" class="px-2 py-3 text-center text-xs font-semibold uppercase text-slate-500">{{ weekday }}</div>
        </div>
        <div class="grid grid-cols-7">
          <article
            v-for="day in calendarDays"
            :key="day.format('YYYY-MM-DD')"
            class="min-h-28 border-b border-r border-slate-100 p-2 dark:border-slate-800"
            :class="!day.isSame(currentMonth, 'month') ? 'bg-slate-50/70 text-slate-400 dark:bg-slate-900/50' : ''"
          >
            <time :datetime="day.format('YYYY-MM-DD')" class="grid size-7 place-items-center rounded-full text-xs" :class="day.isSame(dayjs(), 'day') ? 'bg-emerald-600 font-semibold text-white' : ''">
              {{ day.date() }}
            </time>
            <ul class="mt-1 space-y-1">
              <li
                v-for="event in eventsForDay(day)"
                :key="`${event.kind}-${event.id}`"
                class="truncate rounded px-1.5 py-1 text-[11px] leading-4"
                :class="event.kind === 'holiday' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'"
                :title="event.label"
              >
                {{ event.label }}
              </li>
            </ul>
          </article>
        </div>
      </div>
      <p v-if="props.mode === 'holidays' && holidays.length === 0" class="py-5 text-center text-sm text-slate-500">{{ t('leave.noHolidays') }}</p>
      <p v-if="props.mode === 'leaveCalendar' && approvedRequests.length === 0" class="py-5 text-center text-sm text-slate-500">{{ t('leave.noApprovedLeave') }}</p>
    </div>
    <footer class="flex flex-wrap gap-4 border-t border-slate-200 px-5 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
      <span class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-sky-500" />{{ t('leave.holiday') }}</span>
      <span v-if="props.mode === 'leaveCalendar'" class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-emerald-500" />{{ t('leave.whoIsOff') }}</span>
    </footer>
  </section>
</template>
