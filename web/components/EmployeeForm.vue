<script setup lang="ts">
import { z } from 'zod'
import AppSelect from '~/components/app/AppSelect.vue'
import { useNotify } from '~/composables/useNotify'
import type { Branch, Department, Employee, Position } from '~/types'
import { employeePhotoValidationError } from '~/utils/employeePhoto'
import { useDelayedPending } from '~/composables/useDelayedPending'

const props = defineProps<{
  employee?: Employee | null
  onSave: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Employee>
}>()

const { t } = useI18n()
const notify = useNotify()
const api = useHrApi()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const photoError = ref('')
const selectedPhoto = ref<File | null>(null)
const photoRemoved = ref(false)
const photoPreview = ref('')
const photoInput = ref<HTMLInputElement | null>(null)
const branches = ref<Branch[]>([])
const departments = ref<Department[]>([])
const positions = ref<Position[]>([])
const form = reactive({
  employeeNo: '',
  firstName: '',
  lastName: '',
  firstNameKh: '',
  lastNameKh: '',
  gender: 'male',
  dob: '',
  phone: '',
  email: '',
  hireDate: '',
  terminationDate: '',
  terminationReason: '',
  branchId: '',
  departmentId: '',
  positionId: '',
  managerId: '',
  status: 'active',
})

const employeeSchema = z.object({
  employeeNo: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  firstNameKh: z.string(),
  lastNameKh: z.string(),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string(),
  phone: z.string(),
  email: z.union([z.string().email(), z.literal('')]),
  hireDate: z.string().min(1),
  terminationDate: z.string(),
  terminationReason: z.string(),
  branchId: z.string(),
  departmentId: z.string(),
  positionId: z.string(),
  managerId: z.string(),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']),
})

async function loadOptions() {
  loading.value = true
  error.value = ''
  try {
    const [branchPage, departmentPage, positionPage, employeePage] = await Promise.all([
      api.organization.branches.list({ sortBy: 'name' }),
      api.organization.departments.list({ sortBy: 'name' }),
      api.organization.positions.list({ sortBy: 'title' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
    ])
    branches.value = branchPage.items
    departments.value = departmentPage.items
    positions.value = positionPage.items.filter((position: Position) => !position.departmentId || position.departmentId === form.departmentId)
    if (!form.departmentId) positions.value = positionPage.items
    if (props.employee) {
      form.employeeNo = props.employee.employeeNo
      form.firstName = props.employee.firstName
      form.lastName = props.employee.lastName
      form.firstNameKh = props.employee.firstNameKh ?? ''
      form.lastNameKh = props.employee.lastNameKh ?? ''
      form.gender = props.employee.gender
      form.dob = props.employee.dob ?? ''
      form.phone = props.employee.phone ?? ''
      form.email = props.employee.email ?? ''
      form.hireDate = props.employee.hireDate
      form.terminationDate = props.employee.terminationDate ?? ''
      form.terminationReason = props.employee.terminationReason ?? ''
      form.branchId = props.employee.branchId ?? ''
      form.departmentId = props.employee.departmentId ?? ''
      form.positionId = props.employee.positionId ?? ''
      form.managerId = props.employee.managerId ?? ''
      form.status = props.employee.status
    }
    managers.value = employeePage.items.filter(item => item.id !== props.employee?.id)
    updatePositions(positionPage.items)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

const managers = ref<Employee[]>([])
const allPositions = ref<Position[]>([])

function updatePositions(source = allPositions.value) {
  allPositions.value = source
  positions.value = source.filter((position: Position) => !position.departmentId || position.departmentId === form.departmentId)
  if (form.positionId && !positions.value.some((position: Position) => position.id === form.positionId)) form.positionId = ''
}

async function submit() {
  if (saving.value) return
  error.value = ''
  if (photoError.value) return
  const result = employeeSchema.safeParse(form)
  if (!result.success) {
    error.value = result.error.issues[0]?.message ?? t('common.invalidForm')
    return
  }

  const companyId = props.employee?.companyId ?? 'company-phkar'
  const record = {
    companyId,
    branchId: result.data.branchId || null,
    departmentId: result.data.departmentId || null,
    positionId: result.data.positionId || null,
    employeeNo: result.data.employeeNo.trim(),
    firstName: result.data.firstName.trim(),
    lastName: result.data.lastName.trim(),
    firstNameKh: result.data.firstNameKh.trim() || null,
    lastNameKh: result.data.lastNameKh.trim() || null,
    gender: result.data.gender,
    dob: result.data.dob || null,
    phone: result.data.phone.trim() || null,
    email: result.data.email.trim() || null,
    hireDate: result.data.hireDate,
    terminationDate: result.data.terminationDate || null,
    terminationReason: result.data.terminationReason.trim() || null,
    photoPath: props.employee?.photoPath ?? null,
    status: result.data.status,
    managerId: result.data.managerId || null,
  } satisfies Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>

  saving.value = true
  try {
    const savedEmployee = await props.onSave(record)
    if (selectedPhoto.value) {
      await api.employees.photos.upload(savedEmployee.id, selectedPhoto.value)
    } else if (photoRemoved.value) {
      await api.employees.photos.remove(savedEmployee.id)
    }
    notify.success(t(props.employee ? 'toast.employeeUpdated' : 'toast.employeeCreated'), undefined, `employee-save:${savedEmployee.id}`)
    await navigateTo(`/employees/${savedEmployee.id}`)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const validationError = employeePhotoValidationError(file)
  if (validationError) {
    selectedPhoto.value = null
    photoError.value = t(`employees.${validationError}`)
    input.value = ''
    return
  }

  photoError.value = ''
  selectedPhoto.value = file
  photoRemoved.value = false
}

function removePhoto() {
  selectedPhoto.value = null
  photoRemoved.value = Boolean(props.employee?.photoPath)
  photoError.value = ''
  if (photoInput.value) photoInput.value.value = ''
}

watch<File | null>(selectedPhoto, (file: File | null, _previous: File | null, onCleanup: (cleanupFn: () => void) => void) => {
  if (!file) {
    photoPreview.value = ''
    return
  }
  const objectUrl = URL.createObjectURL(file)
  photoPreview.value = objectUrl
  onCleanup(() => URL.revokeObjectURL(objectUrl))
})

onMounted(loadOptions)
</script>

<template>
  <form class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950" @submit.prevent="submit">
    <div v-if="showSkeleton && !error" class="py-3" aria-hidden="true"><SkeletonForm :fields="10" /></div>
    <div v-else-if="error && branches.length === 0" role="alert" class="py-4 text-sm text-red-600">{{ error }}</div>
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.photo') }}</span>
        <div class="flex flex-wrap items-center gap-4">
          <AppAvatar
            :name="`${form.firstName} ${form.lastName}`"
            :khmer-name="`${form.firstNameKh} ${form.lastNameKh}`"
            :photo-path="photoPreview || (photoRemoved ? null : props.employee?.photoPath ?? null)"
            size="lg"
          />
          <div class="space-y-2">
            <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" :disabled="saving" class="block max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-medium file:text-emerald-800 disabled:opacity-60 dark:text-slate-300 dark:file:bg-emerald-950 dark:file:text-emerald-300" @change="selectPhoto">
            <p class="text-xs text-slate-500">{{ t('employees.photoRequirements') }}</p>
            <button v-if="props.employee?.photoPath || selectedPhoto" type="button" :disabled="saving" class="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400" @click="removePhoto">{{ t('employees.removePhoto') }}</button>
            <p v-if="photoError" role="alert" class="text-sm text-red-600">{{ photoError }}</p>
          </div>
        </div>
      </div>
      <label v-for="field in ['employeeNo', 'firstName', 'lastName', 'firstNameKh', 'lastNameKh', 'phone', 'email', 'dob', 'hireDate', 'terminationDate', 'terminationReason'] as const" :key="field" class="block" :class="field === 'terminationReason' ? 'sm:col-span-2' : ''">
        <span class="mb-1.5 block text-sm font-medium">{{ t(`employees.fields.${field}`) }}</span>
        <input v-model="form[field]" :type="field === 'email' ? 'email' : field === 'dob' || field === 'hireDate' || field === 'terminationDate' ? 'date' : 'text'" :required="['employeeNo', 'firstName', 'lastName', 'hireDate'].includes(field)" class="form-control">
      </label>

      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.fields.gender') }}</span>
        <AppSelect
          v-model="form.gender"
          :options="['male', 'female', 'other'].map(value => ({ label: t(`employees.genders.${value}`), value }))"
        />
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.fields.status') }}</span>
        <AppSelect
          v-model="form.status"
          :options="['active', 'inactive', 'on_leave', 'terminated'].map(value => ({ label: t(`employees.statuses.${value}`), value }))"
        />
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.fields.branchId') }}</span>
        <AppSelect v-model="form.branchId" :options="branches.map((branch: Branch) => ({ label: branch.name, value: branch.id }))" :placeholder="t('common.notSet')" clearable />
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.fields.departmentId') }}</span>
        <AppSelect v-model="form.departmentId" :options="departments.map((department: Department) => ({ label: department.name, value: department.id }))" :placeholder="t('common.notSet')" clearable @change="updatePositions()" />
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.fields.positionId') }}</span>
        <AppSelect v-model="form.positionId" :options="positions.map((position: Position) => ({ label: position.title, value: position.id }))" :placeholder="t('common.notSet')" clearable />
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">{{ t('employees.fields.managerId') }}</span>
        <AppSelect v-model="form.managerId" :options="managers.map((manager: Employee) => ({ label: `${manager.firstName} ${manager.lastName} (${manager.employeeNo})`, value: manager.id }))" :placeholder="t('common.notSet')" clearable />
      </label>
    </div>
    <p v-if="error && !loading" role="alert" class="mt-4 text-sm text-red-600">{{ error }}</p>
    <div v-if="!loading && (!error || branches.length)" class="mt-6 flex justify-end gap-2">
      <NuxtLink to="/employees" class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-700">{{ t('common.cancel') }}</NuxtLink>
      <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? t('common.saving') : t('common.saveEmployee') }}</button>
    </div>
  </form>
</template>

<style scoped>
.form-control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  outline: none;
}

.form-control:focus {
  border-color: rgb(5 150 105);
  box-shadow: 0 0 0 2px rgb(209 250 229);
}
</style>
