<script setup lang="ts">
import { z } from 'zod'
import AppTransition from '~/components/app/AppTransition.vue'
import type { LeaveType } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const api = useHrApi()
const rows = ref<LeaveType[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const isOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const form = reactive({
  name: '',
  daysPerYear: '18',
  maxDaysPerRequest: '30',
  isPaid: true,
  carryOver: false,
  requiresAttachment: false,
})

const schema = z.object({
  name: z.string().trim().min(1),
  daysPerYear: z.coerce.number().min(0).max(365),
  maxDaysPerRequest: z.coerce.number().min(0).max(365),
  isPaid: z.boolean(),
  carryOver: z.boolean(),
  requiresAttachment: z.boolean(),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await api.leave.types.list({ sortBy: 'name' })).items
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function openForm(type?: LeaveType) {
  editingId.value = type?.id ?? null
  formError.value = ''
  form.name = type?.name ?? ''
  form.daysPerYear = String(type?.daysPerYear ?? 18)
  form.maxDaysPerRequest = String(type?.maxDaysPerRequest ?? 30)
  form.isPaid = type?.isPaid ?? true
  form.carryOver = type?.carryOver ?? false
  form.requiresAttachment = type?.requiresAttachment ?? false
  isOpen.value = true
}

async function save() {
  if (saving.value) return
  formError.value = ''
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('common.invalidForm')
    return
  }
  saving.value = true
  try {
    const values = {
      ...parsed.data,
      name: parsed.data.name.trim(),
    }
    if (editingId.value) {
      await api.leave.types.update(editingId.value, values)
      notify.success(t('toast.leaveTypeUpdated'), undefined, `leave-type-save:${editingId.value}`)
    } else {
      const created = await api.leave.types.create(values)
      notify.success(t('toast.leaveTypeCreated'), undefined, `leave-type-save:${created.id}`)
    }
    isOpen.value = false
    await load()
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function remove(type: LeaveType) {
  if (saving.value) return
  if (!window.confirm(t('common.confirmDelete', { name: type.name }))) return
  saving.value = true
  try {
    const [balances, requests] = await Promise.all([
      api.leave.balances.list({ filter: { leaveTypeId: type.id } }),
      api.leave.requests.list({ filter: { leaveTypeId: type.id } }),
    ])
    if (balances.total > 0 || requests.total > 0) {
      error.value = t('leave.typeInUse')
      return
    }
    await api.leave.types.delete(type.id)
    notify.success(t('toast.leaveTypeDeleted'), undefined, `leave-type-delete:${type.id}`)
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
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="flex items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
      <div>
        <h2 class="text-lg font-semibold">{{ t('leave.leaveTypes') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('leave.leaveTypesHelp') }}</p>
      </div>
      <button type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="openForm()">{{ t('leave.addType') }}</button>
    </header>

    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="6" /></div>
    <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="rows.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('common.empty') }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr>
            <th class="px-5 py-3">{{ t('leave.typeName') }}</th>
            <th class="px-5 py-3">{{ t('leave.daysPerYear') }}</th>
            <th class="px-5 py-3">{{ t('leave.maxDaysPerRequest') }}</th>
            <th class="px-5 py-3">{{ t('leave.attachmentRequired') }}</th>
            <th class="px-5 py-3">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="type in rows" :key="type.id">
            <td class="px-5 py-3">
              <span class="block font-medium">{{ type.name }}</span>
            </td>
            <td class="px-5 py-3">{{ type.daysPerYear }}</td>
            <td class="px-5 py-3">{{ type.maxDaysPerRequest }}</td>
            <td class="px-5 py-3">{{ t(type.requiresAttachment ? 'common.yes' : 'common.no') }}</td>
            <td class="whitespace-nowrap px-5 py-3">
              <button class="mr-3 text-emerald-700 hover:underline dark:text-emerald-400" @click="openForm(type)">{{ t('common.edit') }}</button>
              <button :disabled="saving" class="text-red-600 hover:underline disabled:opacity-50" @click="remove(type)">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppTransition name="motion-dialog">
    <div v-if="isOpen" class="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4" @click.self="isOpen = false">
      <section role="dialog" aria-modal="true" class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-950">
        <h3 class="text-lg font-semibold">{{ t(editingId ? 'leave.editType' : 'leave.addType') }}</h3>
        <form class="mt-5 space-y-4" @submit.prevent="save">
          <label v-for="field in ['name', 'daysPerYear', 'maxDaysPerRequest'] as const" :key="field" class="block">
            <span class="mb-1.5 block text-sm font-medium">{{ t(`leave.${field}`) }}</span>
            <input v-model="form[field]" :type="field !== 'name' ? 'number' : 'text'" :min="field !== 'name' ? 0 : undefined" required class="control">
          </label>
          <label class="flex items-center gap-2 text-sm"><input v-model="form.isPaid" type="checkbox" class="size-4 accent-emerald-600">{{ t('leave.isPaid') }}</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="form.carryOver" type="checkbox" class="size-4 accent-emerald-600">{{ t('leave.carryOver') }}</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="form.requiresAttachment" type="checkbox" class="size-4 accent-emerald-600">{{ t('leave.attachmentRequired') }}</label>
          <p v-if="formError" role="alert" class="text-sm text-red-600">{{ formError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" @click="isOpen = false">{{ t('common.cancel') }}</button>
            <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? t('common.saving') : t('common.save') }}</button>
          </div>
        </form>
      </section>
    </div>
    </AppTransition>
  </section>
</template>

<style scoped>
.control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
