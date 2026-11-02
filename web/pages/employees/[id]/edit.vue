<script setup lang="ts">
import type { Employee } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'

const { t } = useI18n()
const route = useRoute()
const api = useHrApi()
const employee = ref<Employee | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    employee.value = await api.employees.employees.getById(String(route.params.id))
    if (!employee.value) error.value = t('employees.notFound')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

async function updateEmployee(record: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
  if (!employee.value) throw new Error(t('employees.notFound'))
  return api.employees.employees.update(employee.value.id, record)
}

const { pending: pagePending } = await useAsyncData(`employee-edit-${route.params.id}`, async () => { await load(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-5">
    <div>
      <NuxtLink :to="`/employees/${route.params.id}`" class="text-sm text-emerald-700 hover:underline dark:text-emerald-400">← {{ t('employees.backToProfile') }}</NuxtLink>
      <h2 class="mt-3 text-xl font-semibold">{{ t('employees.editEmployee') }}</h2>
    </div>
    <div v-if="showSkeleton && !error" aria-hidden="true"><SkeletonForm :fields="8" /></div>
    <p v-else-if="error" role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }}</p>
    <EmployeeForm v-else-if="employee" :employee="employee" :on-save="updateEmployee" />
  </div>
</template>
