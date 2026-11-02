<script setup lang="ts">
import { z } from 'zod'
import type { Company, Settings } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const { can } = usePermission()
const api = useHrApi()
const company = ref<Company | null>(null)
const settings = ref<Settings | null>(null)
const loading = ref(true)
const savingCompany = ref(false)
const savingSettings = ref(false)
const error = ref('')
const companyMessage = ref('')
const settingsMessage = ref('')

const companyForm = reactive({
  name: '',
  taxId: '',
})
const settingsForm = reactive({
  workWeek: [] as number[],
  workStartTime: '08:00',
  graceMinutes: '15',
  defaultCurrency: 'USD',
})
const weekdays = [1, 2, 3, 4, 5, 6, 0]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [companyPage, settingsPage] = await Promise.all([
      api.organization.companies.list({ limit: 1 }),
      api.organization.settings.list({ limit: 1 }),
    ])
    company.value = companyPage.items[0] ?? null
    settings.value = settingsPage.items[0] ?? null
    if (company.value) {
      for (const key of Object.keys(companyForm) as Array<keyof typeof companyForm>) {
        companyForm[key] = company.value[key] ?? ''
      }
    }
    if (settings.value) {
      settingsForm.workWeek = settings.value.workWeek.split(',').map((day: string) => Number(day.trim()))
      settingsForm.workStartTime = settings.value.workStartTime
      settingsForm.graceMinutes = String(settings.value.graceMinutes)
      settingsForm.defaultCurrency = settings.value.defaultCurrency
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

async function saveCompany() {
  if (savingCompany.value) return
  companyMessage.value = ''
  const parsed = z.object({
    name: z.string().trim().min(1),
    taxId: z.string(),
  }).safeParse(companyForm)

  if (!parsed.success) {
    companyMessage.value = t('common.invalidForm')
    return
  }

  savingCompany.value = true
  try {
    const values = {
      name: parsed.data.name,
      taxId: parsed.data.taxId || null,
      defaultCurrency: settings.value?.defaultCurrency ?? settingsForm.defaultCurrency.toUpperCase(),
    }
    company.value = company.value
      ? await api.organization.companies.update(company.value.id, values)
      : await api.organization.companies.create(values)
    companyMessage.value = t('common.saved')
    notify.success(t('toast.companySaved'), undefined, `organization-company-save:${company.value.id}`)
  } catch (cause) {
    companyMessage.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    savingCompany.value = false
  }
}

async function saveSettings() {
  if (savingSettings.value) return
  settingsMessage.value = ''
  const parsed = z.object({
    workWeek: z.array(z.number().int().min(0).max(6)).min(1),
    workStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    graceMinutes: z.coerce.number().int().min(0).max(240),
    defaultCurrency: z.string().trim().length(3),
  }).safeParse(settingsForm)

  if (!parsed.success) {
    settingsMessage.value = t('common.invalidForm')
    return
  }

  savingSettings.value = true
  try {
    const values = {
      ...parsed.data,
      workWeek: parsed.data.workWeek.join(','),
      defaultCurrency: parsed.data.defaultCurrency.toUpperCase(),
      companyId: company.value?.id ?? '',
    }
    settings.value = settings.value
      ? await api.organization.settings.update(settings.value.id, values)
      : await api.organization.settings.create(values)
    settingsMessage.value = t('common.saved')
    notify.success(t('toast.settingsSaved'), undefined, `organization-settings-save:${settings.value.id}`)
  } catch (cause) {
    settingsMessage.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    savingSettings.value = false
  }
}

const { pending: pagePending } = await useAsyncData('organization-page-data', async () => { await load(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
</script>

<template>
  <div>
    <OrganizationNav />
    <div v-if="showSkeleton && !error" class="grid gap-6 xl:grid-cols-2" aria-hidden="true"><SkeletonForm :fields="3" /><SkeletonForm :fields="4" /></div>
    <p v-else-if="error" role="alert" class="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }} <button type="button" class="ml-2 font-medium underline" @click="load">{{ t('common.retry') }}</button></p>
    <div v-else class="grid gap-6 xl:grid-cols-2">
      <form class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950" @submit.prevent="saveCompany">
        <div>
          <h2 class="text-lg font-semibold">{{ t('organization.companyDetails') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('organization.companyDescription') }}</p>
        </div>
        <label v-for="field in ['name', 'taxId'] as const" :key="field" class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t(`organization.fields.${field}`) }}</span>
          <input v-model="companyForm[field]" type="text" :required="field === 'name'" :disabled="!can('organization.manage')" class="form-control">
        </label>
        <p v-if="companyMessage" role="status" class="text-sm" :class="companyMessage === t('common.saved') ? 'text-emerald-700' : 'text-red-600'">{{ companyMessage }}</p>
        <button v-if="can('organization.manage')" type="submit" :disabled="savingCompany" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{{ savingCompany ? t('common.saving') : t('common.saveCompany') }}</button>
      </form>

      <form class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950" @submit.prevent="saveSettings">
        <div>
          <h2 class="text-lg font-semibold">{{ t('organization.workSettings') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('organization.settingsDescription') }}</p>
        </div>
        <fieldset>
          <legend class="mb-2 text-sm font-medium">{{ t('organization.fields.workWeek') }}</legend>
          <div class="flex flex-wrap gap-3">
            <label v-for="day in weekdays" :key="day" class="flex items-center gap-2 text-sm">
              <input v-model="settingsForm.workWeek" type="checkbox" :value="day" :disabled="!can('organization.manage')" class="accent-emerald-600">
              {{ t(`organization.weekdays.${day}`) }}
            </label>
          </div>
        </fieldset>
        <label v-for="field in ['workStartTime', 'graceMinutes', 'defaultCurrency'] as const" :key="field" class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t(`organization.fields.${field}`) }}</span>
          <input v-model="settingsForm[field]" :type="field === 'workStartTime' ? 'time' : field === 'graceMinutes' ? 'number' : 'text'" :min="field === 'graceMinutes' ? 0 : undefined" :disabled="!can('organization.manage')" class="form-control">
        </label>
        <p v-if="settingsMessage" role="status" class="text-sm" :class="settingsMessage === t('common.saved') ? 'text-emerald-700' : 'text-red-600'">{{ settingsMessage }}</p>
        <button v-if="can('organization.manage')" type="submit" :disabled="savingSettings" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{{ savingSettings ? t('common.saving') : t('common.saveSettings') }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
