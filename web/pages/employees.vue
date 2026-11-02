<script setup lang="ts">
import AppSelect from '~/components/app/AppSelect.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import type { Branch, Department, Employee } from '~/types'

const { t } = useI18n()
const { can } = usePermission()
const api = useHrApi()
const employees = ref<Employee[]>([])
const branches = ref<Branch[]>([])
const departments = ref<Department[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const branchId = ref('')
const departmentId = ref('')
const status = ref('')
const page = ref(1)
const pageSize = 10

const filteredEmployees = computed(() => {
  const term = search.value.trim().toLowerCase()
  return employees.value.filter((employee: Employee) => {
    const matchesSearch = !term || [
      employee.employeeNo,
      employee.firstName,
      employee.lastName,
      employee.firstNameKh,
      employee.lastNameKh,
      employee.email,
    ].some(value => value?.toLowerCase().includes(term))
    return matchesSearch
      && (!branchId.value || employee.branchId === branchId.value)
      && (!departmentId.value || employee.departmentId === departmentId.value)
      && (!status.value || employee.status === status.value)
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredEmployees.value.length / pageSize)))
const visibleEmployees = computed(() => filteredEmployees.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const canManage = computed(() => can('employees.manage'))

watch([search, branchId, departmentId, status], () => {
  page.value = 1
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const employeePage = await api.employees.employees.list({ sortBy: 'employeeNo' })
    employees.value = employeePage.items
    if (can('organization.manage')) {
      const [branchPage, departmentPage] = await Promise.all([
        api.organization.branches.list({ sortBy: 'name' }),
        api.organization.departments.list({ sortBy: 'name' }),
      ])
      branches.value = branchPage.items
      departments.value = departmentPage.items
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function lookupName(id: string | null, rows: Array<{ id: string; name: string }>): string {
  return id ? rows.find(row => row.id === id)?.name ?? t('common.notSet') : t('common.notSet')
}

function exportCsv() {
  const headers = [
    t('employees.fields.employeeNo'),
    t('employees.fields.firstName'),
    t('employees.fields.lastName'),
    t('employees.fields.firstNameKh'),
    t('employees.fields.lastNameKh'),
    t('employees.fields.email'),
    t('employees.fields.phone'),
    t('employees.fields.branchId'),
    t('employees.fields.departmentId'),
    t('employees.fields.status'),
  ]
  const records = filteredEmployees.value.map((employee: Employee) => [
    employee.employeeNo,
    employee.firstName,
    employee.lastName,
    employee.firstNameKh ?? '',
    employee.lastNameKh ?? '',
    employee.email ?? '',
    employee.phone ?? '',
    lookupName(employee.branchId, branches.value),
    lookupName(employee.departmentId, departments.value),
    t(`employees.statuses.${employee.status}`),
  ])
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [headers, ...records].map(row => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'employees.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const { pending: pagePending } = await useAsyncData('employees-page-data', async () => { await load(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
      <div>
        <h2 class="text-lg font-semibold">{{ t('pages.employees') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('employees.count', { count: filteredEmployees.length }) }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" @click="exportCsv">{{ t('employees.exportCsv') }}</button>
        <NuxtLink v-if="canManage" to="/employees/new" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{{ t('employees.addEmployee') }}</NuxtLink>
      </div>
    </header>

    <div v-if="!showSkeleton" class="grid gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-4">
      <input v-model="search" type="search" :placeholder="t('employees.search')" class="filter-control">
      <AppSelect
        v-model="branchId"
        :options="branches.map((branch: Branch) => ({ label: branch.name, value: branch.id }))"
        :placeholder="t('employees.allBranches')"
        clearable
      />
      <AppSelect
        v-model="departmentId"
        :options="departments.map((department: Department) => ({ label: department.name, value: department.id }))"
        :placeholder="t('employees.allDepartments')"
        clearable
      />
      <AppSelect
        v-model="status"
        :options="['active', 'inactive', 'on_leave', 'terminated'].map(value => ({ label: t(`employees.statuses.${value}`), value }))"
        :placeholder="t('employees.allStatuses')"
        clearable
      />
    </div>
    <SkeletonFilterBar v-else aria-hidden="true" />

    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="10" :columns="7" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 font-medium underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="visibleEmployees.length === 0" class="p-10 text-center text-sm text-slate-500">{{ t('employees.noEmployees') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr>
            <th class="px-5 py-3">{{ t('employees.fields.employeeNo') }}</th>
            <th class="px-5 py-3">{{ t('employees.employeeName') }}</th>
            <th class="px-5 py-3">{{ t('employees.fields.branchId') }}</th>
            <th class="px-5 py-3">{{ t('employees.fields.departmentId') }}</th>
            <th class="px-5 py-3">{{ t('employees.fields.email') }}</th>
            <th class="px-5 py-3">{{ t('employees.fields.status') }}</th>
            <th class="px-5 py-3">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="employee in visibleEmployees" :key="employee.id" class="hover:bg-slate-50 dark:hover:bg-slate-900">
            <td class="whitespace-nowrap px-5 py-3 font-medium">{{ employee.employeeNo }}</td>
            <td class="whitespace-nowrap px-5 py-3">
              <div class="flex items-center gap-3">
                <AppAvatar :employee="employee" size="sm" />
                <div>
                  <NuxtLink :to="`/employees/${employee.id}`" class="font-medium text-emerald-700 hover:underline dark:text-emerald-400">{{ employee.firstName }} {{ employee.lastName }}</NuxtLink>
                  <span v-if="employee.firstNameKh || employee.lastNameKh" class="mt-0.5 block text-xs text-slate-500">{{ employee.firstNameKh }} {{ employee.lastNameKh }}</span>
                </div>
              </div>
            </td>
            <td class="whitespace-nowrap px-5 py-3">{{ lookupName(employee.branchId, branches) }}</td>
            <td class="whitespace-nowrap px-5 py-3">{{ lookupName(employee.departmentId, departments) }}</td>
            <td class="whitespace-nowrap px-5 py-3">{{ employee.email || t('common.notSet') }}</td>
            <td class="whitespace-nowrap px-5 py-3">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="{
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': employee.status === 'active',
                'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': employee.status === 'on_leave',
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300': employee.status === 'inactive',
                'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300': employee.status === 'terminated',
              }">{{ t(`employees.statuses.${employee.status}`) }}</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3">
              <NuxtLink v-if="canManage" :to="`/employees/${employee.id}/edit`" class="text-emerald-700 hover:underline dark:text-emerald-400">{{ t('common.edit') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer v-if="!loading && !error && filteredEmployees.length > 0" class="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
      <span class="text-slate-500">{{ t('employees.pagination', { page, pageCount }) }}</span>
      <div class="flex gap-2">
        <button type="button" :disabled="page <= 1" class="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50 dark:border-slate-700" @click="page--">{{ t('common.previous') }}</button>
        <button type="button" :disabled="page >= pageCount" class="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50 dark:border-slate-700" @click="page++">{{ t('common.next') }}</button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.filter-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
