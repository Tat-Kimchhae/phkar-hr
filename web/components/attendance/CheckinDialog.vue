<script setup lang="ts">
import dayjs from 'dayjs'
import AppSelect from '~/components/app/AppSelect.vue'
import AppTransition from '~/components/app/AppTransition.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { distanceInMeters } from '~/utils/attendance'
import type { AttendanceLocation, AttendanceLog } from '~/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const notify = useNotify()
const api = useHrApi()
const auth = useAuthStore()
const locations = ref<AttendanceLocation[]>([])
const locationId = ref('')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const accuracy = ref(10)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const success = ref(false)
const alreadyCheckedIn = ref(false)

const selectedLocation = computed<AttendanceLocation | null>(() =>
  locations.value.find((location: AttendanceLocation) => location.id === locationId.value) ?? null,
)
const distance = computed(() => {
  if (!selectedLocation.value || latitude.value === null || longitude.value === null) return null
  return distanceInMeters(
    { latitude: selectedLocation.value.latitude, longitude: selectedLocation.value.longitude },
    { latitude: latitude.value, longitude: longitude.value },
  )
})
const withinRadius = computed(() => distance.value !== null
  && selectedLocation.value !== null
  && distance.value <= selectedLocation.value.radiusM)

function selectLocation(id: string) {
  locationId.value = id
  const location = locations.value.find((item: AttendanceLocation) => item.id === id)
  latitude.value = location?.latitude ?? null
  longitude.value = location?.longitude ?? null
}

async function loadLocations() {
  loading.value = true
  error.value = ''
  success.value = false
  try {
    const [locationPage, logPage] = await Promise.all([
      api.attendance.locations.list({ sortBy: 'name' }),
      api.attendance.logs.list(),
    ])
    locations.value = locationPage.items
    alreadyCheckedIn.value = Boolean(auth.user?.employeeId && logPage.items.some((log: AttendanceLog) =>
      log.employeeId === auth.user?.employeeId && log.checkIn
      && log.workDate === dayjs().format('YYYY-MM-DD'),
    ))
    if (!locationId.value && locationPage.items[0]) selectLocation(locationPage.items[0].id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

async function simulateCheckin() {
  if (saving.value) return
  if (!selectedLocation.value || latitude.value === null || longitude.value === null || alreadyCheckedIn.value) return
  if (!withinRadius.value) {
    notify.warning(t('toast.checkinOutsideGeofence'), undefined, 'attendance-checkin-outside-geofence')
    return
  }
  saving.value = true
  error.value = ''
  success.value = false
  try {
    await api.attendance.logs.create({
      employeeId: useAuthStore().user?.employeeId ?? '',
      locationId: selectedLocation.value.id,
      workDate: dayjs().format('YYYY-MM-DD'),
      checkIn: new Date().toISOString(),
      checkOut: null,
      checkInLat: latitude.value,
      checkInLng: longitude.value,
      checkOutLat: null,
      checkOutLng: null,
      gpsAccuracyM: accuracy.value,
      isMockLocation: true,
      deviceId: 'Simulated browser location',
      method: 'gps_simulated',
      reason: null,
      editedBy: null,
      status: 'present',
    })
    notify.success(t('toast.checkinSuccess'), undefined, `attendance-checkin:${auth.user?.employeeId ?? ''}:${dayjs().format('YYYY-MM-DD')}`)
    success.value = true
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

watch(() => props.open, (isOpen: boolean) => {
  if (isOpen) void loadLocations()
  else success.value = false
})

onMounted(() => {
  if (props.open) void loadLocations()
})
</script>

<template>
  <AppTransition name="motion-dialog">
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" :aria-label="t('attendance.simulateCheckin')">
    <section class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-950">
      <header class="flex items-start justify-between gap-4">
        <div><h2 class="text-xl font-semibold">{{ t('attendance.simulateCheckin') }}</h2><p class="mt-1 text-sm text-slate-500">{{ t('attendance.simulationNotice') }}</p></div>
        <button type="button" class="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" :aria-label="t('common.cancel')" @click="emit('close')">×</button>
      </header>
      <div v-if="showSkeleton && !error" class="py-3" aria-hidden="true"><SkeletonForm :fields="3" /></div>
      <div v-else class="mt-5 space-y-4">
        <div v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }}</div>
        <div v-if="success" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{{ t('attendance.checkinSaved') }}</div>
        <div v-if="alreadyCheckedIn" role="status" class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-300">{{ t('attendance.alreadyCheckedIn') }}</div>
        <div v-if="locations.length === 0" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{{ t('attendance.noLocations') }}</div>
        <template v-else>
          <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.location') }}</span>
            <AppSelect
              v-model="locationId"
              :options="locations.map((location: AttendanceLocation) => ({ label: `${location.name} · ${location.radiusM} m`, value: location.id }))"
              @change="selectLocation(locationId)"
            />
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.latitude') }}</span><input v-model.number="latitude" type="number" step="any" class="attendance-control"></label>
            <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.longitude') }}</span><input v-model.number="longitude" type="number" step="any" class="attendance-control"></label>
            <label class="block"><span class="mb-1.5 block text-sm font-medium">{{ t('attendance.accuracyMeters') }}</span><input v-model.number="accuracy" type="number" min="0" class="attendance-control"></label>
          </div>
          <div v-if="selectedLocation && distance !== null" class="rounded-lg border p-4 text-sm" :class="withinRadius ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200'">
            <p class="font-semibold">{{ withinRadius ? t('attendance.withinRadius') : t('attendance.outsideRadius') }}</p>
            <p class="mt-1">{{ t('attendance.distanceRadius', { distance: Math.round(distance), radius: selectedLocation.radiusM }) }}</p>
          </div>
        </template>
      </div>
      <footer class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button type="button" :disabled="saving || loading || !withinRadius || success || alreadyCheckedIn" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="simulateCheckin">{{ saving ? t('common.saving') : t('attendance.simulateAndCheckin') }}</button>
      </footer>
    </section>
  </div>
  </AppTransition>
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
