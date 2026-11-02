<script setup lang="ts">
import type { Employee } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'

const { t } = useI18n()
const route = useRoute()
const api = useHrApi()
const { can } = usePermission()
const employee = ref<Employee | null>(null)
const branches = ref<Array<{ id: string; name: string }>>([])
const departments = ref<Array<{ id: string; name: string }>>([])
const positions = ref<Array<{ id: string; title: string }>>([])
const loading = ref(true)
const error = ref('')
const activeTab = ref('profile')
const detailRows = ref<Array<Record<string, string | number | boolean | null>>>([])
const detailLoading = ref(false)
const detailError = ref('')

const tabs = [
  'profile',
  'documents',
  'contracts',
  'emergencyContacts',
  'salaryHistory',
  'allowancesDeductions',
  'bankAccounts',
  'dependents',
  'loans',
  'leaveBalances',
  'attendance',
  'payslips',
]

const profileFields = computed(() => {
  if (!employee.value) return []
  return [
    ['employeeNo', employee.value.employeeNo],
    ['firstName', employee.value.firstName],
    ['lastName', employee.value.lastName],
    ['firstNameKh', employee.value.firstNameKh],
    ['lastNameKh', employee.value.lastNameKh],
    ['gender', t(`employees.genders.${employee.value.gender}`)],
    ['dob', employee.value.dob],
    ['phone', employee.value.phone],
    ['email', employee.value.email],
    ['hireDate', employee.value.hireDate],
    ['status', t(`employees.statuses.${employee.value.status}`)],
    ['branchId', branches.value.find((item: { id: string; name: string }) => item.id === employee.value?.branchId)?.name],
    ['departmentId', departments.value.find((item: { id: string; name: string }) => item.id === employee.value?.departmentId)?.name],
    ['positionId', positions.value.find((item: { id: string; title: string }) => item.id === employee.value?.positionId)?.title],
    ['terminationDate', employee.value.terminationDate],
    ['terminationReason', employee.value.terminationReason],
  ]
})

const detailColumns = computed(() => {
  if (detailRows.value.length === 0) return []
  return Object.keys(detailRows.value[0]).filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
})

async function loadEmployee() {
  loading.value = true
  error.value = ''
  try {
    const loadedEmployee = await api.employees.employees.getById(String(route.params.id))
    employee.value = loadedEmployee
    if (can('organization.manage')) {
      const [branchPage, departmentPage, positionPage] = await Promise.all([
        api.organization.branches.list(),
        api.organization.departments.list(),
        api.organization.positions.list(),
      ])
      branches.value = branchPage.items
      departments.value = departmentPage.items
      positions.value = positionPage.items
    }
    if (!loadedEmployee) error.value = t('employees.notFound')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function stringifyRows<T extends object>(items: T[]): Array<Record<string, string | number | boolean | null>> {
  return items.map((item) => {
    const row: Record<string, string | number | boolean | null> = {}
    for (const [key, value] of Object.entries(item)) {
      if (key === 'accountNumber' && typeof value === 'string') {
        row[key] = `•••• ${value.slice(-4)}`
      } else if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        row[key] = value
      } else if (Array.isArray(value)) {
        row[key] = value.join(', ')
      }
    }
    return row
  })
}

async function loadTab(tab: string) {
  activeTab.value = tab
  detailError.value = ''
  detailRows.value = []
  if (tab === 'profile' || !employee.value) return

  detailLoading.value = true
  try {
    const id = employee.value.id
    switch (tab) {
      case 'documents':
        detailRows.value = stringifyRows((await api.employees.documents.list({ filter: { employeeId: id } })).items)
        break
      case 'contracts':
        detailRows.value = stringifyRows((await api.employees.contracts.list({ filter: { employeeId: id } })).items)
        break
      case 'emergencyContacts':
        detailRows.value = stringifyRows((await api.employees.emergencyContacts.list({ filter: { employeeId: id } })).items)
        break
      case 'salaryHistory':
        detailRows.value = stringifyRows((await api.payroll.employeeSalaries.list({ filter: { employeeId: id }, sortBy: 'effectiveFrom', sortDirection: 'desc' })).items)
        break
      case 'allowancesDeductions': {
        const [allowances, deductions] = await Promise.all([
          api.payroll.employeeAllowances.list({ filter: { employeeId: id } }),
          api.payroll.employeeDeductions.list({ filter: { employeeId: id } }),
        ])
        detailRows.value = [
          ...stringifyRows(allowances.items).map(row => ({ ...row, recordType: t('employees.allowance') })),
          ...stringifyRows(deductions.items).map(row => ({ ...row, recordType: t('employees.deduction') })),
        ]
        break
      }
      case 'bankAccounts':
        detailRows.value = stringifyRows((await api.employees.bankAccounts.list({ filter: { employeeId: id } })).items)
        break
      case 'dependents':
        detailRows.value = stringifyRows((await api.employees.dependents.list({ filter: { employeeId: id } })).items)
        break
      case 'loans':
        detailRows.value = stringifyRows((await api.payroll.employeeLoans.list({ filter: { employeeId: id } })).items)
        break
      case 'leaveBalances':
        detailRows.value = stringifyRows((await api.leave.balances.list({ filter: { employeeId: id } })).items)
        break
      case 'attendance':
        detailRows.value = stringifyRows((await api.attendance.logs.list({ filter: { employeeId: id }, sortBy: 'checkInAt', sortDirection: 'desc' })).items)
        break
      case 'payslips':
        detailRows.value = stringifyRows((await api.payroll.payslips.list({ filter: { employeeId: id }, sortBy: 'issuedAt', sortDirection: 'desc' })).items)
        break
    }
  } catch (cause) {
    detailError.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    detailLoading.value = false
  }
}

function cellLabel(column: string): string {
  return t(`employees.detailFields.${column}`, column.replace(/([A-Z])/g, ' $1'))
}

function isExpired(date: string | number | boolean | null): boolean {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) && new Date(date) < new Date(new Date().toDateString())
}

const { pending: pagePending } = await useAsyncData(`employee-detail-${route.params.id}`, async () => { await loadEmployee(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
const tabSkeleton = useDelayedPending(computed(() => detailLoading.value && !detailError.value))
</script>

<template>
  <div v-if="showSkeleton && !error" aria-hidden="true"><SkeletonDetail :tabs="tabs.length" /></div>
  <div v-else-if="error" role="alert" class="rounded-lg bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }} <button type="button" class="ml-2 font-medium underline" @click="loadEmployee">{{ t('common.retry') }}</button></div>
  <div v-else-if="employee" class="space-y-5">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <NuxtLink to="/employees" class="text-sm text-emerald-700 hover:underline dark:text-emerald-400">← {{ t('employees.backToList') }}</NuxtLink>
        <div class="mt-3 flex items-center gap-4">
          <AppAvatar :employee="employee" size="lg" />
          <div>
            <h2 class="text-2xl font-semibold">{{ employee.firstName }} {{ employee.lastName }}</h2>
            <p v-if="employee.firstNameKh || employee.lastNameKh" class="mt-1 text-sm text-slate-500">{{ employee.firstNameKh }} {{ employee.lastNameKh }}</p>
          </div>
        </div>
        <p class="mt-1 text-sm text-slate-500">{{ employee.employeeNo }} · {{ t(`employees.statuses.${employee.status}`) }}</p>
      </div>
      <NuxtLink v-if="can('employees.manage')" :to="`/employees/${employee.id}/edit`" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{{ t('common.edit') }}</NuxtLink>
    </header>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <nav class="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 dark:border-slate-800" :aria-label="t('employees.detailTabs')">
        <button v-for="tab in tabs" :key="tab" type="button" class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" :class="activeTab === tab ? '!bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''" @click="loadTab(tab)">
          {{ t(`employees.tabs.${tab}`) }}
        </button>
      </nav>

      <dl v-if="activeTab === 'profile'" class="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="[field, value] in profileFields" :key="field">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ t(`employees.fields.${field}`) }}</dt>
          <dd class="mt-1 text-sm">{{ value || t('common.notSet') }}</dd>
        </div>
      </dl>
      <div v-else-if="tabSkeleton" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="4" /></div>
      <div v-else-if="detailError" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ detailError }}</div>
      <div v-else-if="detailRows.length === 0" class="p-10 text-center text-sm text-slate-500">{{ t('common.empty') }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr><th v-for="column in detailColumns" :key="column" class="whitespace-nowrap px-5 py-3">{{ cellLabel(column) }}</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="(row, index) in detailRows" :key="String(row.id ?? index)">
              <td v-for="column in detailColumns" :key="column" class="whitespace-nowrap px-5 py-3">
                <span v-if="column === 'expiresAt' && row[column]" class="rounded-full px-2.5 py-1 text-xs font-medium" :class="isExpired(row[column]) ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'">
                  {{ isExpired(row[column]) ? t('employees.expired') : t('employees.valid') }} · {{ row[column] }}
                </span>
                <span v-else>{{ row[column] ?? t('common.notSet') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
