<script setup lang="ts">
import { z } from 'zod'
import AppSelect from '~/components/app/AppSelect.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'
import type { Employee, PayrollAdjustment, PayrollPeriod, PayrollRun } from '~/types'

const { t } = useI18n()
const notify = useNotify()
const { can } = usePermission()
const api = useHrApi()
const canManagePayroll = computed(() => can('payroll.manage'))
const adjustments = ref<PayrollAdjustment[]>([])
const employees = ref<Employee[]>([])
const periods = ref<PayrollPeriod[]>([])
const runs = ref<PayrollRun[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const formError = ref('')
const employeeId = ref('')
const payrollPeriodId = ref('')
const adjustmentType = ref<'earning' | 'deduction'>('earning')
const description = ref('')
const amount = ref<number | null>(null)
const editingId = ref('')

const formSchema = z.object({
  employeeId: z.string().min(1),
  periodId: z.string().min(1),
  type: z.enum(['earning', 'deduction']),
  description: z.string().trim().min(1),
  amount: z.number().positive(),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [adjustmentPage, employeePage, periodPage, runPage] = await Promise.all([
      api.payroll.adjustments.list({ sortBy: 'createdAt', sortDirection: 'desc' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
      api.payroll.periods.list({ sortBy: 'startDate', sortDirection: 'desc' }),
      api.payroll.runs.list(),
    ])
    adjustments.value = adjustmentPage.items
    employees.value = employeePage.items
    periods.value = periodPage.items
    runs.value = runPage.items
    if (!payrollPeriodId.value && periodPage.items[0]) payrollPeriodId.value = periodPage.items[0].id
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function hasRun(periodId: string): boolean {
  return runs.value.some((run: PayrollRun) => run.periodId === periodId && run.status !== 'cancelled')
}

function employeeName(id: string): string {
  const employee = employees.value.find((item: Employee) => item.id === id)
  return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNo})` : t('common.notSet')
}

function periodName(id: string): string {
  const period = periods.value.find((item: PayrollPeriod) => item.id === id)
  return period ? `${period.startDate} – ${period.endDate}` : t('common.notSet')
}

async function addAdjustment() {
  if (saving.value) return
  formError.value = ''
  const parsed = formSchema.safeParse({
    employeeId: employeeId.value,
    periodId: payrollPeriodId.value,
    type: adjustmentType.value,
    description: description.value,
    amount: amount.value,
  })
  if (!parsed.success) {
    formError.value = t('common.invalidForm')
    return
  }
  if (hasRun(parsed.data.periodId)) {
    formError.value = t('payroll.computedAdjustmentError')
    return
  }
  saving.value = true
  try {
    const record = { ...parsed.data, name: parsed.data.description, reason: null }
    if (editingId.value) await api.payroll.adjustments.update(editingId.value, record)
    else await api.payroll.adjustments.create(record)
    const actionId = editingId.value || `${parsed.data.employeeId}:${parsed.data.periodId}:${parsed.data.description}:${parsed.data.amount}`
    notify.success(t(editingId.value ? 'toast.adjustmentUpdated' : 'toast.adjustmentCreated'), undefined, `payroll-adjustment-save:${actionId}`)
    resetForm()
    await load()
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

function editAdjustment(adjustment: PayrollAdjustment) {
  if (adjustment.type !== 'earning' && adjustment.type !== 'deduction') {
    formError.value = t('common.invalidForm')
    return
  }
  editingId.value = adjustment.id
  employeeId.value = adjustment.employeeId
  payrollPeriodId.value = adjustment.periodId
  adjustmentType.value = adjustment.type
  description.value = adjustment.name
  amount.value = adjustment.amount
  formError.value = ''
}

function resetForm() {
  editingId.value = ''
  employeeId.value = ''
  payrollPeriodId.value = periods.value[0]?.id ?? ''
  adjustmentType.value = 'earning'
  description.value = ''
  amount.value = null
  formError.value = ''
}

async function removeAdjustment(adjustment: PayrollAdjustment) {
  if (saving.value) return
  if (!window.confirm(t('common.confirmDelete', { name: adjustment.name }))) return
  saving.value = true
  error.value = ''
  try {
    await api.payroll.adjustments.delete(adjustment.id)
    notify.success(t('toast.adjustmentDeleted'), undefined, `payroll-adjustment-delete:${adjustment.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.deleteError')
  } finally {
    saving.value = false
  }
}

function money(value: number, code: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value)
}

onMounted(load)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800"><h2 class="text-lg font-semibold">{{ t('payroll.adjustments') }}</h2><p class="mt-1 text-sm text-slate-500">{{ t('payroll.adjustmentsDescription') }}</p></header>
    <form v-if="canManagePayroll" class="grid gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-4" @submit.prevent="addAdjustment">
      <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('payroll.employee') }}</span><AppSelect v-model="employeeId" :options="employees.map((employee: Employee) => ({ label: `${employee.firstName} ${employee.lastName} (${employee.employeeNo})`, value: employee.id }))" :placeholder="t('payroll.selectEmployee')" required /></label>
      <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('payroll.period') }}</span><AppSelect v-model="payrollPeriodId" :options="periods.map((period: PayrollPeriod) => ({ label: `${periodName(period.id)}${hasRun(period.id) ? ` · ${t('payroll.readOnly')}` : ''}`, value: period.id, disabled: hasRun(period.id) }))" required /></label>
      <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('payroll.adjustmentType') }}</span><AppSelect v-model="adjustmentType" :options="[{ label: t('payroll.values.earning'), value: 'earning' }, { label: t('payroll.values.deduction'), value: 'deduction' }]" /></label>
      <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('payroll.amount') }}</span><input v-model.number="amount" type="number" min="0.01" step="any" required class="payroll-control"></label>
      <label class="block sm:col-span-2"><span class="mb-1.5 block text-sm font-medium">{{ t('payroll.description') }}</span><input v-model="description" type="text" required class="payroll-control"></label>
      <p v-if="formError" role="alert" class="text-sm text-red-600 sm:col-span-2 xl:col-span-3">{{ formError }}</p>
      <div class="flex items-end gap-2"><button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? t('common.saving') : editingId ? t('common.save') : t('payroll.addAdjustment') }}</button><button v-if="editingId" type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="resetForm">{{ t('common.cancel') }}</button></div>
    </form>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="6" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button></div>
    <div v-else-if="adjustments.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('payroll.noAdjustments') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th class="px-5 py-3">{{ t('payroll.employee') }}</th><th class="px-5 py-3">{{ t('payroll.period') }}</th><th class="px-5 py-3">{{ t('payroll.description') }}</th><th class="px-5 py-3">{{ t('payroll.adjustmentType') }}</th><th class="px-5 py-3">{{ t('payroll.amount') }}</th><th class="px-5 py-3">{{ t('common.actions') }}</th></tr></thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="adjustment in adjustments" :key="adjustment.id">
            <td class="whitespace-nowrap px-5 py-3">{{ employeeName(adjustment.employeeId) }}</td><td class="whitespace-nowrap px-5 py-3">{{ periodName(adjustment.periodId) }}</td><td class="px-5 py-3">{{ adjustment.name }}</td><td class="px-5 py-3">{{ t(`payroll.values.${adjustment.type}`) }}</td><td class="whitespace-nowrap px-5 py-3">{{ money(adjustment.amount, 'USD') }}</td><td class="whitespace-nowrap px-5 py-3"><button v-if="canManagePayroll" type="button" :disabled="hasRun(adjustment.periodId)" class="mr-3 font-medium text-emerald-700 hover:underline disabled:opacity-40 dark:text-emerald-400" @click="editAdjustment(adjustment)">{{ t('common.edit') }}</button><button v-if="canManagePayroll" type="button" :disabled="hasRun(adjustment.periodId)" class="font-medium text-red-700 hover:underline disabled:opacity-40 dark:text-red-400" @click="removeAdjustment(adjustment)">{{ t('common.delete') }}</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.payroll-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
