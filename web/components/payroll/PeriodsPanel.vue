<script setup lang="ts">
import dayjs from 'dayjs'
import { z } from 'zod'
import type { PayrollPeriod, PayrollRun } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const { can } = usePermission()
const api = useHrApi()
const canManagePayroll = computed(() => can('payroll.manage'))
const periods = ref<PayrollPeriod[]>([])
const runs = ref<PayrollRun[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const saveError = ref('')
const showForm = ref(false)
const month = ref(dayjs().format('YYYY-MM'))

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [periodPage, runPage] = await Promise.all([
      api.payroll.periods.list({ sortBy: 'startDate', sortDirection: 'desc' }),
      api.payroll.runs.list({ sortBy: 'createdAt', sortDirection: 'desc' }),
    ])
    periods.value = periodPage.items
    runs.value = runPage.items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function periodStatus(period: PayrollPeriod): string {
  const run = runs.value.find((item: PayrollRun) => item.periodId === period.id)
  return run?.status ?? period.status
}

function periodName(period: PayrollPeriod): string {
  return `${dayjs(period.startDate).format('MMMM YYYY')}`
}

async function createPeriod() {
  if (saving.value) return
  saveError.value = ''
  const result = periodSchema.safeParse(month.value)
  if (!result.success) {
    saveError.value = t('payroll.invalidPeriod')
    return
  }
  const start = dayjs(`${result.data}-01`)
  const startDate = start.format('YYYY-MM-DD')
  const endDate = start.endOf('month').format('YYYY-MM-DD')
  if (periods.value.some((period: PayrollPeriod) => period.startDate === startDate)) {
    saveError.value = t('payroll.duplicatePeriod')
    return
  }
  saving.value = true
  try {
    const company = (await api.organization.companies.list({ page: 1, pageSize: 1 })).items[0]
    if (!company) throw new Error(t('payroll.companyRequired'))
    await api.payroll.periods.create({
      companyId: company.id,
      startDate,
      endDate,
      status: 'draft',
    })
    notify.success(t('toast.payrollPeriodCreated'), undefined, `payroll-period-create:${startDate}`)
    showForm.value = false
    await load()
  } catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function removePeriod(period: PayrollPeriod) {
  if (saving.value) return
  if (!window.confirm(t('common.confirmDelete', { name: periodName(period) }))) return
  saving.value = true
  error.value = ''
  try {
    await api.payroll.periods.delete(period.id)
    notify.success(t('toast.payrollPeriodDeleted'), undefined, `payroll-period-delete:${period.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.deleteError')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
      <div><h2 class="text-lg font-semibold">{{ t('payroll.periods') }}</h2><p class="mt-1 text-sm text-slate-500">{{ t('payroll.periodsDescription') }}</p></div>
      <button v-if="canManagePayroll" type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" @click="showForm = !showForm">{{ t('payroll.addPeriod') }}</button>
    </header>
    <form v-if="showForm && canManagePayroll" class="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5 dark:border-slate-800" @submit.prevent="createPeriod">
      <label class="block"><span class="mb-1 block text-sm font-medium">{{ t('payroll.periodMonth') }}</span><input v-model="month" type="month" required class="payroll-control"></label>
      <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? t('common.saving') : t('payroll.createPeriod') }}</button>
      <p v-if="saveError" role="alert" class="basis-full text-sm text-red-600">{{ saveError }}</p>
    </form>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="4" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button></div>
    <div v-else-if="periods.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('payroll.noPeriods') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th class="px-5 py-3">{{ t('payroll.period') }}</th><th class="px-5 py-3">{{ t('payroll.startDate') }}</th><th class="px-5 py-3">{{ t('payroll.endDate') }}</th><th class="px-5 py-3">{{ t('payroll.status') }}</th><th class="px-5 py-3">{{ t('common.actions') }}</th></tr></thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="period in periods" :key="period.id">
            <td class="px-5 py-3 font-medium">{{ periodName(period) }}</td><td class="px-5 py-3">{{ period.startDate }}</td><td class="px-5 py-3">{{ period.endDate }}</td>
            <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="periodStatus(period) === 'locked' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : periodStatus(period) === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'">{{ t(`payroll.statuses.${periodStatus(period)}`) }}</span></td>
            <td class="px-5 py-3"><button v-if="canManagePayroll" type="button" class="text-sm font-medium text-red-700 hover:underline dark:text-red-400" @click="removePeriod(period)">{{ t('common.delete') }}</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.payroll-control {
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
