<script setup lang="ts">
import AdjustmentsPanel from '~/components/payroll/AdjustmentsPanel.vue'
import LoansPanel from '~/components/payroll/LoansPanel.vue'
import PeriodsPanel from '~/components/payroll/PeriodsPanel.vue'
import RunsPanel from '~/components/payroll/RunsPanel.vue'
import SetupPanel from '~/components/payroll/SetupPanel.vue'

type PayrollSection = 'runs' | 'periods' | 'setup' | 'adjustments' | 'loans'

const { t } = useI18n()
const auth = useAuthStore()
const section = ref<PayrollSection>('runs')
const tabs: Array<{ key: PayrollSection; label: string }> = [
  { key: 'runs', label: 'runs' },
  { key: 'periods', label: 'periods' },
  { key: 'setup', label: 'setup' },
  { key: 'adjustments', label: 'adjustments' },
  { key: 'loans', label: 'loans' },
]
const allowed = computed(() => auth.user?.role === 'admin' || auth.user?.role === 'hr')
</script>

<template>
  <div v-if="allowed" class="space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('pages.payroll') }}</h1>
      <p class="mt-1 text-sm text-slate-500">{{ t('payroll.pageDescription') }}</p>
      <p class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{{ t('payroll.demoRateNotice') }}</p>
    </header>
    <nav class="flex flex-wrap gap-2" :aria-label="t('payroll.sections')">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        :class="section === tab.key ? '!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''"
        @click="section = tab.key"
      >
        {{ t(`payroll.${tab.label}`) }}
      </button>
    </nav>
    <RunsPanel v-if="section === 'runs'" />
    <PeriodsPanel v-else-if="section === 'periods'" />
    <SetupPanel v-else-if="section === 'setup'" />
    <AdjustmentsPanel v-else-if="section === 'adjustments'" />
    <LoansPanel v-else-if="section === 'loans'" />
  </div>
</template>
