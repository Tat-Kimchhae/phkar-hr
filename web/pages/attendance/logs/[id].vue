<script setup lang="ts">
import dayjs from 'dayjs'
import { z } from 'zod'
import type { AttendanceLocation, AttendanceLog, Employee } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

const { t } = useI18n()
const notify = useNotify()
const route = useRoute()
const api = useHrApi()
const auth = useAuthStore()
const { can } = usePermission()
const log = ref<AttendanceLog | null>(null)
const employee = ref<Employee | null>(null)
const location = ref<AttendanceLocation | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saveError = ref('')
const saved = ref(false)
const checkInTime = ref('')
const checkOutTime = ref('')
const reason = ref('')
const canManuallyEdit = computed(() => can('attendance.manage')
  && (auth.user?.role === 'admin' || auth.user?.role === 'hr'))

const editSchema = z.object({
  checkInTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('attendance.invalidTime')), z.literal('')]),
  checkOutTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('attendance.invalidTime')), z.literal('')]),
  reason: z.string().trim().min(1, t('attendance.reasonRequired')),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const record = await api.attendance.logs.getById(String(route.params.id))
    if (!record) {
      log.value = null
      return
    }
    const [employeeRecord, locationRecord] = await Promise.all([
      api.employees.employees.getById(record.employeeId),
      record.locationId ? api.attendance.locations.getById(record.locationId) : Promise.resolve(null),
    ])
    log.value = record
    employee.value = employeeRecord
    location.value = locationRecord
    checkInTime.value = record.checkIn ? dayjs(record.checkIn).format('HH:mm') : ''
    checkOutTime.value = record.checkOut ? dayjs(record.checkOut).format('HH:mm') : ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function onDate(time: string): string | null {
  if (!time || !log.value) return null
  const date = log.value.workDate
  const [hour, minute] = time.split(':').map(Number)
  return time ? dayjs(`${date}T00:00:00`).hour(hour).minute(minute).second(0).millisecond(0).toISOString() : null
}

async function saveManualEdit() {
  if (saving.value) return
  saveError.value = ''
  saved.value = false
  const parsed = editSchema.safeParse({ checkInTime: checkInTime.value, checkOutTime: checkOutTime.value, reason: reason.value })
  if (!parsed.success || !log.value) {
    saveError.value = parsed.success ? t('common.saveError') : parsed.error.issues[0]?.message ?? t('common.invalidForm')
    return
  }
  saving.value = true
  try {
    await api.attendance.logs.update(log.value.id, {
      checkIn: onDate(parsed.data.checkInTime),
      checkOut: onDate(parsed.data.checkOutTime),
      method: 'manual',
      reason: parsed.data.reason,
      editedBy: auth.user?.id ?? null,
    })
    reason.value = ''
    saved.value = true
    notify.success(t('toast.manualAttendanceSaved'), undefined, `attendance-log-edit:${log.value.id}`)
    await load()
  } catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

const { pending: pagePending } = await useAsyncData(`attendance-log-${route.params.id}`, async () => { await load(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
</script>

<template>
  <div class="space-y-5">
    <NuxtLink to="/attendance" class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">← {{ t('attendance.backToAttendance') }}</NuxtLink>
    <div v-if="showSkeleton && !error" aria-hidden="true"><SkeletonDetail :tabs="0" /></div>
    <div v-else-if="error" role="alert" class="rounded-xl bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      <p>{{ error }}</p><button class="mt-2 underline" @click="load">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="!log" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">{{ t('attendance.logNotFound') }}</div>
    <template v-else>
      <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h1 class="text-xl font-semibold">{{ t('attendance.logDetails') }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeNo})` : t('common.notSet') }}</p>
        <dl class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.date') }}</dt><dd class="mt-1">{{ log.checkInAt ? dayjs(log.checkInAt).format('YYYY-MM-DD') : t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.checkIn') }}</dt><dd class="mt-1">{{ log.checkInAt ? dayjs(log.checkInAt).format('YYYY-MM-DD HH:mm:ss') : t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.checkOut') }}</dt><dd class="mt-1">{{ log.checkOutAt ? dayjs(log.checkOutAt).format('YYYY-MM-DD HH:mm:ss') : t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.location') }}</dt><dd class="mt-1">{{ location?.name ?? t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.coordinates') }}</dt><dd class="mt-1">{{ log.checkInLatitude ?? t('common.notSet') }}, {{ log.checkInLongitude ?? t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.accuracyMeters') }}</dt><dd class="mt-1">{{ log.accuracyMeters ?? t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.mockLocation') }}</dt><dd class="mt-1">{{ log.isMockLocation ? t('common.yes') : t('common.no') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.device') }}</dt><dd class="mt-1">{{ log.device ?? t('common.notSet') }}</dd></div>
          <div><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.method') }}</dt><dd class="mt-1">{{ log.method }}</dd></div>
          <div v-if="log.manualEditReason" class="sm:col-span-2 lg:col-span-3"><dt class="text-xs font-medium uppercase text-slate-500">{{ t('attendance.manualEditReason') }}</dt><dd class="mt-1">{{ log.manualEditReason }}</dd></div>
        </dl>
      </section>
      <section v-if="canManuallyEdit" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 class="text-lg font-semibold">{{ t('attendance.manualEdit') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('attendance.manualEditDescription') }}</p>
        <form class="mt-5 space-y-4" @submit.prevent="saveManualEdit">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.checkIn') }}</span><input v-model="checkInTime" type="time" class="attendance-control"></label>
            <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.checkOut') }}</span><input v-model="checkOutTime" type="time" class="attendance-control"></label>
          </div>
          <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.reasonRequired') }}</span><textarea v-model="reason" required rows="3" class="attendance-control" /></label>
          <p v-if="saveError" role="alert" class="text-sm text-red-600">{{ saveError }}</p>
          <p v-if="saved" role="status" class="text-sm text-emerald-700 dark:text-emerald-400">{{ t('attendance.manualEditSaved') }}</p>
          <div class="flex justify-end"><button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? t('common.saving') : t('attendance.saveManualEdit') }}</button></div>
        </form>
      </section>
    </template>
  </div>
</template>

<style scoped>
.attendance-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}
</style>
