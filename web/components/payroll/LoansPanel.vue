<script setup lang="ts">
import type { Employee, EmployeeLoan } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'

const { t } = useI18n()
const api = useHrApi()
const loans = ref<EmployeeLoan[]>([])
const employees = ref<Employee[]>([])
const loading = ref(true)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))

const outstandingByCurrency = computed(() => {
  const totals = new Map<string, number>()
  for (const loan of loans.value) {
    totals.set(loan.currency, (totals.get(loan.currency) ?? 0) + loan.outstandingAmount)
  }
  return [...totals.entries()]
})

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

function employeeName(id: string): string {
  const employee = employees.value.find((item: Employee) => item.id === id)
  return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNo})` : t('common.notSet')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [loanPage, employeePage] = await Promise.all([
      api.payroll.employeeLoans.list({ sortBy: 'startDate', sortDirection: 'desc' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
    ])
    loans.value = loanPage.items
    employees.value = employeePage.items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-lg font-semibold">{{ t('payroll.loans') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('payroll.loansDescription') }}</p>
      <div v-if="outstandingByCurrency.length" class="mt-3 flex flex-wrap gap-3">
        <p v-for="[currency, total] in outstandingByCurrency" :key="currency" class="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-900">{{ t('payroll.totalOutstanding') }} · {{ currency }} <strong class="ml-1">{{ money(total, currency) }}</strong></p>
      </div>
    </header>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="6" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button></div>
    <div v-else-if="loans.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('payroll.noLoans') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th class="px-5 py-3">{{ t('payroll.employee') }}</th><th class="px-5 py-3">{{ t('payroll.principal') }}</th><th class="px-5 py-3">{{ t('payroll.outstanding') }}</th><th class="px-5 py-3">{{ t('payroll.installment') }}</th><th class="px-5 py-3">{{ t('payroll.startDate') }}</th><th class="px-5 py-3">{{ t('payroll.endDate') }}</th><th class="px-5 py-3">{{ t('payroll.status') }}</th></tr></thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="loan in loans" :key="loan.id">
            <td class="whitespace-nowrap px-5 py-3 font-medium">{{ employeeName(loan.employeeId) }}</td><td class="whitespace-nowrap px-5 py-3">{{ money(loan.principalAmount, loan.currency) }}</td><td class="whitespace-nowrap px-5 py-3">{{ money(loan.outstandingAmount, loan.currency) }}</td><td class="whitespace-nowrap px-5 py-3">{{ money(loan.installmentAmount, loan.currency) }}</td><td class="whitespace-nowrap px-5 py-3">{{ loan.startDate }}</td><td class="whitespace-nowrap px-5 py-3">{{ loan.endDate ?? t('common.notSet') }}</td><td class="px-5 py-3">{{ t(`payroll.values.${loan.status}`) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
