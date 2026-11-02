<script setup lang="ts">
import { z } from 'zod'
import AppSelect from '~/components/app/AppSelect.vue'
import AppTransition from '~/components/app/AppTransition.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'
import type {
  Allowance,
  Deduction,
  ExchangeRate,
  SalaryStructure,
  SocialSecurityRule,
  TaxRule,
} from '~/types'

type CatalogKind = 'salaryStructures' | 'allowances' | 'deductions' | 'taxRules' | 'socialSecurityRules' | 'exchangeRates'
type FormValue = string | number | boolean | null
type CatalogForm = Record<string, FormValue>
interface CatalogField {
  key: string
  type: 'text' | 'number' | 'date' | 'checkbox' | 'select'
  optional?: boolean
  options?: string[]
  demoRate?: boolean
  unit?: string
}
interface CatalogDefinition {
  kind: CatalogKind
  title: string
  fields: CatalogField[]
}
interface CatalogRow {
  id: string
  values: CatalogForm
}

const { t } = useI18n()
const notify = useNotify()
const { can } = usePermission()
const api = useHrApi()
const canManagePayroll = computed(() => can('payroll.manage'))
const definitions: CatalogDefinition[] = [
  { kind: 'salaryStructures', title: 'salaryStructures', fields: [{ key: 'name', type: 'text' }] },
  { kind: 'allowances', title: 'allowances', fields: [{ key: 'name', type: 'text' }, { key: 'calcType', type: 'select', options: ['fixed', 'percentage'] }, { key: 'defaultAmount', type: 'number' }, { key: 'isTaxable', type: 'checkbox' }] },
  { kind: 'deductions', title: 'deductions', fields: [{ key: 'name', type: 'text' }, { key: 'calcType', type: 'select', options: ['fixed', 'percentage'] }, { key: 'rate', type: 'number', demoRate: true }] },
  { kind: 'taxRules', title: 'taxRules', fields: [{ key: 'name', type: 'text' }, { key: 'bracketMin', type: 'number' }, { key: 'bracketMax', type: 'number', optional: true }, { key: 'rate', type: 'number', demoRate: true }, { key: 'effectiveFrom', type: 'date' }] },
  { kind: 'socialSecurityRules', title: 'socialSecurityRules', fields: [{ key: 'name', type: 'text' }, { key: 'employeeRate', type: 'number', demoRate: true }, { key: 'employerRate', type: 'number', demoRate: true }, { key: 'salaryCap', type: 'number' }, { key: 'effectiveFrom', type: 'date' }] },
  { kind: 'exchangeRates', title: 'exchangeRates', fields: [{ key: 'currency', type: 'text' }, { key: 'rateToBase', type: 'number', demoRate: true }, { key: 'effectiveDate', type: 'date' }] },
]
const rows = ref<Record<CatalogKind, CatalogRow[]>>({
  salaryStructures: [], allowances: [], deductions: [], taxRules: [], socialSecurityRules: [], exchangeRates: [],
})
const selectedKind = ref<CatalogKind | null>(null)
const selectedId = ref('')
const draft = ref<CatalogForm>({})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const formError = ref('')

function toForm(record: object): CatalogForm {
  const values: CatalogForm = {}
  for (const [key, value] of Object.entries(record)) {
    values[key] = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null
  }
  return values
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [
      salaryPage, allowancePage, deductionPage, taxPage, socialPage, ratePage,
    ] = await Promise.all([
      api.payroll.salaryStructures.list({ sortBy: 'name' }),
      api.payroll.allowances.list({ sortBy: 'name' }),
      api.payroll.deductions.list({ sortBy: 'name' }),
      api.payroll.taxRules.list({ sortBy: 'incomeFrom' }),
      api.payroll.socialSecurityRules.list({ sortBy: 'name' }),
      api.payroll.exchangeRates.list({ sortBy: 'effectiveDate', sortDirection: 'desc' }),
    ])
    rows.value = {
      salaryStructures: salaryPage.items.map((item: SalaryStructure) => ({ id: item.id, values: toForm(item) })),
      allowances: allowancePage.items.map((item: Allowance) => ({ id: item.id, values: toForm(item) })),
      deductions: deductionPage.items.map((item: Deduction) => ({ id: item.id, values: toForm(item) })),
      taxRules: taxPage.items.map((item: TaxRule) => ({ id: item.id, values: toForm(item) })),
      socialSecurityRules: socialPage.items.map((item: SocialSecurityRule) => ({ id: item.id, values: toForm(item) })),
      exchangeRates: ratePage.items.map((item: ExchangeRate) => ({ id: item.id, values: toForm(item) })),
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function openForm(kind: CatalogKind, row?: CatalogRow) {
  selectedKind.value = kind
  selectedId.value = row?.id ?? ''
  draft.value = row ? { ...row.values } : {}
  for (const field of definitions.find(item => item.kind === kind)?.fields ?? []) {
    if (draft.value[field.key] !== undefined) continue
    draft.value[field.key] = field.type === 'checkbox' ? false : field.type === 'number' ? 0 : ''
  }
  if (kind === 'allowances' || kind === 'deductions') draft.value.calcType = draft.value.calcType || 'fixed'
  formError.value = ''
}

function textValue(key: string): string {
  const value = draft.value[key]
  return value === null || value === undefined ? '' : String(value)
}

function numberValue(key: string): number {
  const value = draft.value[key]
  return value === null || value === undefined || value === '' ? 0 : Number(value)
}

function optionalNumber(key: string): number | null {
  const value = draft.value[key]
  return value === null || value === undefined || value === '' ? null : Number(value)
}

async function save() {
  if (!selectedKind.value || saving.value) return
  const savedKind: CatalogKind = selectedKind.value
  const savedId = selectedId.value
  saving.value = true
  formError.value = ''
  try {
    switch (selectedKind.value) {
      case 'salaryStructures': {
        const data = z.object({
          name: z.string().trim().min(1),
        }).parse({ name: textValue('name') })
        if (selectedId.value) await api.payroll.salaryStructures.update(selectedId.value, data)
        else await api.payroll.salaryStructures.create(data)
        break
      }
      case 'allowances': {
        const data = z.object({
          name: z.string().trim().min(1), calcType: z.enum(['fixed', 'percentage']),
          defaultAmount: z.number().nonnegative(), isTaxable: z.boolean(),
        }).parse({ name: textValue('name'), calcType: draft.value.calcType, defaultAmount: numberValue('defaultAmount'), isTaxable: draft.value.isTaxable === true })
        if (selectedId.value) await api.payroll.allowances.update(selectedId.value, data)
        else await api.payroll.allowances.create(data)
        break
      }
      case 'deductions': {
        const data = z.object({
          name: z.string().trim().min(1), calcType: z.enum(['fixed', 'percentage']), rate: z.number().nonnegative(),
        }).parse({ name: textValue('name'), calcType: draft.value.calcType, rate: numberValue('rate') })
        if (selectedId.value) await api.payroll.deductions.update(selectedId.value, data)
        else await api.payroll.deductions.create(data)
        break
      }
      case 'taxRules': {
        const data = z.object({
          name: z.string().trim().min(1), bracketMin: z.number().nonnegative(),
          bracketMax: z.number().positive().nullable(), rate: z.number().min(0).max(1),
          effectiveFrom: z.string().date(),
        }).superRefine((value, context) => {
          if (value.bracketMax !== null && value.bracketMax <= value.bracketMin) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bracketMax'], message: t('payroll.invalidTaxBracket') })
        }).parse({
          name: textValue('name'), bracketMin: numberValue('bracketMin'), bracketMax: optionalNumber('bracketMax'),
          rate: numberValue('rate'), effectiveFrom: textValue('effectiveFrom'),
        })
        if (selectedId.value) await api.payroll.taxRules.update(selectedId.value, data)
        else await api.payroll.taxRules.create(data)
        break
      }
      case 'socialSecurityRules': {
        const data = z.object({
          name: z.string().trim().min(1), employeeRate: z.number().min(0).max(1),
          employerRate: z.number().min(0).max(1), salaryCap: z.number().positive(),
          effectiveFrom: z.string().date(),
        }).parse({
          name: textValue('name'), employeeRate: numberValue('employeeRate'), employerRate: numberValue('employerRate'),
          salaryCap: numberValue('salaryCap'), effectiveFrom: textValue('effectiveFrom'),
        })
        if (selectedId.value) await api.payroll.socialSecurityRules.update(selectedId.value, data)
        else await api.payroll.socialSecurityRules.create(data)
        break
      }
      case 'exchangeRates': {
        const data = z.object({
          currency: z.string().trim().length(3), rateToBase: z.number().positive(), effectiveDate: z.string().date(),
        }).parse({
          currency: textValue('currency').trim().toUpperCase(),
          rateToBase: numberValue('rateToBase'), effectiveDate: textValue('effectiveDate'),
        })
        if (selectedId.value) await api.payroll.exchangeRates.update(selectedId.value, data)
        else await api.payroll.exchangeRates.create(data)
        break
      }
    }
    const messageKeys: Record<CatalogKind, { created: string; updated: string }> = {
      salaryStructures: { created: 'toast.salaryStructureCreated', updated: 'toast.salaryStructureUpdated' },
      allowances: { created: 'toast.allowanceCreated', updated: 'toast.allowanceUpdated' },
      deductions: { created: 'toast.deductionCreated', updated: 'toast.deductionUpdated' },
      taxRules: { created: 'toast.taxRuleCreated', updated: 'toast.taxRuleUpdated' },
      socialSecurityRules: { created: 'toast.socialSecurityRuleCreated', updated: 'toast.socialSecurityRuleUpdated' },
      exchangeRates: { created: 'toast.exchangeRateCreated', updated: 'toast.exchangeRateUpdated' },
    }
    const recordKey = savedId || textValue(definitions.find(item => item.kind === savedKind)?.fields[0]?.key ?? '')
    notify.success(t(messageKeys[savedKind][savedId ? 'updated' : 'created']), undefined, `payroll-catalog-save:${savedKind}:${recordKey}`)
    selectedKind.value = null
    await load()
  } catch (cause) {
    formError.value = cause instanceof z.ZodError
      ? t('common.invalidForm')
      : cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function remove(kind: CatalogKind, row: CatalogRow) {
  if (saving.value) return
  if (!window.confirm(t('common.confirmDelete', { name: textValueFrom(row, 'name') || textValueFrom(row, 'fromCurrency') }))) return
  saving.value = true
  error.value = ''
  try {
    switch (kind) {
      case 'salaryStructures': await api.payroll.salaryStructures.delete(row.id); break
      case 'allowances': await api.payroll.allowances.delete(row.id); break
      case 'deductions': await api.payroll.deductions.delete(row.id); break
      case 'taxRules': await api.payroll.taxRules.delete(row.id); break
      case 'socialSecurityRules': await api.payroll.socialSecurityRules.delete(row.id); break
      case 'exchangeRates': await api.payroll.exchangeRates.delete(row.id); break
    }
    const messageKeys: Record<CatalogKind, string> = {
      salaryStructures: 'toast.salaryStructureDeleted',
      allowances: 'toast.allowanceDeleted',
      deductions: 'toast.deductionDeleted',
      taxRules: 'toast.taxRuleDeleted',
      socialSecurityRules: 'toast.socialSecurityRuleDeleted',
      exchangeRates: 'toast.exchangeRateDeleted',
    }
    notify.success(t(messageKeys[kind]), undefined, `payroll-catalog-delete:${kind}:${row.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.deleteError')
  } finally {
    saving.value = false
  }
}

function textValueFrom(row: CatalogRow, key: string): string {
  const value = row.values[key]
  return value === null || value === undefined ? '' : String(value)
}

function displayValue(value: FormValue, field: CatalogField): string {
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no')
  if (field.type === 'select' && typeof value === 'string') return t(`payroll.values.${value}`)
  return value === null || value === '' ? t('common.notSet') : String(value)
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <header><h2 class="text-lg font-semibold">{{ t('payroll.setup') }}</h2><p class="mt-1 text-sm text-slate-500">{{ t('payroll.setupDescription') }} {{ t('payroll.demoRateNotice') }}</p></header>
    <div v-if="showSkeleton && !error" class="grid gap-5 lg:grid-cols-2" aria-hidden="true"><SkeletonCard v-for="item in 4" :key="item" /></div>
    <div v-else-if="error" role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"><p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button></div>
    <template v-else>
      <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }}</p>
      <section v-for="definition in definitions" :key="definition.kind" class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div><h3 class="font-semibold">{{ t(`payroll.${definition.title}`) }}</h3><p class="mt-1 text-xs text-slate-500">{{ t(`payroll.${definition.title}Help`) }}</p></div>
          <button v-if="canManagePayroll" type="button" class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" @click="openForm(definition.kind)">{{ t('payroll.addItem') }}</button>
        </header>
        <div v-if="rows[definition.kind].length === 0" class="p-6 text-sm text-slate-500">{{ t('payroll.noItems') }}</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th v-for="field in definition.fields" :key="field.key" class="whitespace-nowrap px-4 py-3">{{ t(`payroll.fields.${field.key}`) }}<span v-if="field.demoRate"> · {{ t('payroll.demoValue') }}</span></th><th class="px-4 py-3">{{ t('common.actions') }}</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="row in rows[definition.kind]" :key="row.id">
                <td v-for="field in definition.fields" :key="field.key" class="whitespace-nowrap px-4 py-3">{{ displayValue(row.values[field.key], field) }}<span v-if="field.unit === '%'">%</span><span v-else-if="field.unit === 'demo'" class="ml-1 text-xs text-slate-500">{{ t('payroll.demoValue') }}</span></td>
                <td class="whitespace-nowrap px-4 py-3"><button v-if="canManagePayroll" type="button" :disabled="saving" class="mr-3 font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400" @click="openForm(definition.kind, row)">{{ t('common.edit') }}</button><button v-if="canManagePayroll" type="button" :disabled="saving" class="font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400" @click="remove(definition.kind, row)">{{ t('common.delete') }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <AppTransition name="motion-dialog">
    <div v-if="selectedKind && canManagePayroll" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" :aria-label="t(`payroll.${selectedKind}`)">
      <form class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-950" @submit.prevent="save">
        <h2 class="text-xl font-semibold">{{ selectedId ? t('payroll.editItem') : t('payroll.addItem') }} · {{ t(`payroll.${selectedKind}`) }}</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label v-for="field in definitions.find(item => item.kind === selectedKind)?.fields ?? []" :key="field.key" class="block" :class="field.type === 'checkbox' ? 'flex items-center gap-2 self-end pb-2' : ''">
            <template v-if="field.type === 'checkbox'">
              <input v-model="draft[field.key]" type="checkbox" class="rounded border-slate-300 text-emerald-600">
              <span class="text-sm font-medium">{{ t(`payroll.fields.${field.key}`) }}</span>
            </template>
            <template v-else>
              <span class="mb-1.5 block text-sm font-medium">{{ t(`payroll.fields.${field.key}`) }}<span v-if="field.optional" class="font-normal text-slate-500"> · {{ t('payroll.optional') }}</span><span v-if="field.demoRate" class="font-normal text-slate-500"> · {{ t('payroll.demoValue') }}</span></span>
              <AppSelect
                v-if="field.type === 'select'"
                v-model="draft[field.key]"
                :options="(field.options ?? []).map(option => ({ label: t(`payroll.values.${option}`), value: option }))"
                required
              />
              <input v-else v-model="draft[field.key]" :type="field.type" :required="!field.optional" :min="field.type === 'number' ? 0 : undefined" step="any" class="payroll-control">
            </template>
          </label>
        </div>
        <p v-if="formError" role="alert" class="mt-4 text-sm text-red-600">{{ formError }}</p>
        <footer class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" @click="selectedKind = null">{{ t('common.cancel') }}</button>
          <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? t('common.saving') : t('common.save') }}</button>
        </footer>
      </form>
    </div>
    </AppTransition>
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
