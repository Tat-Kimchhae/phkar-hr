<script setup lang="ts">
import type { Employee } from '~/types'

definePageMeta({ middleware: [] })

const { t } = useI18n()
const api = useHrApi()

async function createEmployee(record: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
  return api.employees.employees.create(record)
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-5">
    <div>
      <NuxtLink to="/employees" class="text-sm text-emerald-700 hover:underline dark:text-emerald-400">← {{ t('employees.backToList') }}</NuxtLink>
      <h2 class="mt-3 text-xl font-semibold">{{ t('employees.addEmployee') }}</h2>
    </div>
    <EmployeeForm :on-save="createEmployee" />
  </div>
</template>
