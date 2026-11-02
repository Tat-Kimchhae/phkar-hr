<script setup lang="ts">
import LeaveCalendarPanel from '~/components/leave/LeaveCalendarPanel.vue'
import LeaveTypesPanel from '~/components/leave/LeaveTypesPanel.vue'
import MyLeavePanel from '~/components/leave/MyLeavePanel.vue'
import TeamApprovalsPanel from '~/components/leave/TeamApprovalsPanel.vue'

type LeaveSection = 'myLeave' | 'approvals' | 'types' | 'holidays' | 'calendar'

const { t } = useI18n()
const auth = useAuthStore()
const { can } = usePermission()
const isAdmin = computed(() => auth.user?.role === 'admin')
const canReview = computed(() => can('leave.manage'))
const section = ref<LeaveSection>('myLeave')

watch([isAdmin, canReview], () => {
  if (section.value === 'types' && !isAdmin.value) section.value = 'myLeave'
  if (section.value === 'approvals' && !canReview.value) section.value = 'myLeave'
})

const tabs = computed<Array<{ key: LeaveSection; label: string; visible: boolean }>>(() => [
  { key: 'myLeave' as const, label: 'myLeave', visible: true },
  { key: 'approvals' as const, label: 'teamApprovals', visible: canReview.value },
  { key: 'types' as const, label: 'leaveTypes', visible: isAdmin.value },
  { key: 'holidays' as const, label: 'holidayCalendar', visible: true },
  { key: 'calendar' as const, label: 'leaveCalendar', visible: true },
])
const visibleTabs = computed(() => tabs.value.filter((item: { visible: boolean }) => item.visible))
</script>

<template>
  <div class="space-y-5">
    <nav class="flex flex-wrap gap-2" :aria-label="t('leave.sections')">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        :class="section === tab.key ? '!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''"
        @click="section = tab.key"
      >
        {{ t(`leave.${tab.label}`) }}
      </button>
    </nav>

    <MyLeavePanel v-if="section === 'myLeave'" />
    <TeamApprovalsPanel v-else-if="section === 'approvals' && canReview" />
    <LeaveTypesPanel v-else-if="section === 'types' && isAdmin" />
    <LeaveCalendarPanel v-else-if="section === 'holidays'" mode="holidays" />
    <LeaveCalendarPanel v-else-if="section === 'calendar'" mode="leaveCalendar" />
  </div>
</template>
