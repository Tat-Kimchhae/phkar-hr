<script setup lang="ts">
import CheckinDialog from '~/components/attendance/CheckinDialog.vue'
import LogsPanel from '~/components/attendance/LogsPanel.vue'
import MonthlySummary from '~/components/attendance/MonthlySummary.vue'
import ReviewInbox from '~/components/attendance/ReviewInbox.vue'
import TodayBoard from '~/components/attendance/TodayBoard.vue'

type AttendanceSection = 'today' | 'logs' | 'reviews' | 'summary'

const { t } = useI18n()
const auth = useAuthStore()
const { can } = usePermission()
const section = ref<AttendanceSection>('today')
const showCheckin = ref(false)
const canReview = computed(() => can('attendance.manage'))
const canCheckin = computed(() => can('attendance.view') && Boolean(auth.user?.employeeId))

const tabs = computed<Array<{ key: AttendanceSection; label: string; visible: boolean }>>(() => [
  { key: 'today', label: 'todayBoard', visible: true },
  { key: 'logs', label: 'logs', visible: true },
  { key: 'reviews', label: 'reviewInbox', visible: canReview.value },
  { key: 'summary', label: 'monthlySummary', visible: true },
])
const visibleTabs = computed(() => tabs.value.filter((tab: { key: AttendanceSection; label: string; visible: boolean }) => tab.visible))

watch(canReview, (allowed: boolean) => {
  if (!allowed && section.value === 'reviews') section.value = 'today'
})
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ t('pages.attendance') }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ t('attendance.pageDescription') }}</p>
      </div>
      <button v-if="canCheckin" type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="showCheckin = true">{{ t('attendance.simulateCheckin') }}</button>
    </header>

    <nav class="flex flex-wrap gap-2" :aria-label="t('attendance.sections')">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        :class="section === tab.key ? '!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''"
        @click="section = tab.key"
      >
        {{ t(`attendance.${tab.label}`) }}
      </button>
    </nav>

    <TodayBoard v-if="section === 'today'" />
    <LogsPanel v-else-if="section === 'logs'" />
    <ReviewInbox v-else-if="section === 'reviews' && canReview" />
    <MonthlySummary v-else-if="section === 'summary'" />

    <CheckinDialog :open="showCheckin" @close="showCheckin = false" @saved="section = 'today'" />
  </div>
</template>
