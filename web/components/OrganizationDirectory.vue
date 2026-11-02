<script setup lang="ts">
import { z } from 'zod'
import AppSelect from '~/components/app/AppSelect.vue'
import AppTransition from '~/components/app/AppTransition.vue'
import type { AttendanceLocation, Branch, Department, Position } from '~/types'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'

type DirectoryKind = 'branches' | 'departments' | 'positions' | 'locations'
type DirectoryRow = Branch | Department | Position | AttendanceLocation

const props = defineProps<{ kind: DirectoryKind }>()
const { t } = useI18n()
const notify = useNotify()
const { can } = usePermission()
const api = useHrApi()
const rows = ref<DirectoryRow[]>([])
const branches = ref<Branch[]>([])
const departments = ref<Department[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const showSkeleton = useDelayedPending(computed(() => loading.value && !error.value))
const formError = ref('')
const isOpen = ref(false)
const editId = ref<string | null>(null)
const form = reactive<Record<string, string>>({})
const canManage = computed(() => can('organization.manage'))

const titleKey = computed(() => props.kind === 'locations' ? 'attendanceLocations' : props.kind)
const fields = computed(() => {
  const common = [{ key: 'name', type: 'text', required: true }]
  if (props.kind === 'branches') {
    return [...common, { key: 'address', type: 'text' }]
  }
  if (props.kind === 'departments') {
    return [
      ...common,
      { key: 'branchId', type: 'branch' },
      { key: 'parentId', type: 'department' },
    ]
  }
  if (props.kind === 'positions') {
    return [
      { key: 'title', type: 'text', required: true },
      { key: 'departmentId', type: 'department' },
    ]
  }
  return [
    ...common,
    { key: 'branchId', type: 'branch' },
    { key: 'latitude', type: 'number', required: true },
    { key: 'longitude', type: 'number', required: true },
    { key: 'radiusM', type: 'number', required: true },
  ]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [companyPage, branchPage, departmentPage] = await Promise.all([
      api.organization.companies.list({ limit: 1 }),
      api.organization.branches.list({ sortBy: 'name' }),
      api.organization.departments.list({ sortBy: 'name' }),
    ])
    branches.value = branchPage.items
    departments.value = departmentPage.items

    if (props.kind === 'branches') {
      rows.value = branchPage.items
    } else if (props.kind === 'departments') {
      rows.value = departmentPage.items
    } else if (props.kind === 'positions') {
      rows.value = (await api.organization.positions.list({ sortBy: 'title' })).items
    } else {
      rows.value = (await api.organization.attendanceLocations.list({
        sortBy: 'name',
      })).items
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function fieldLabel(key: string) {
  return t(`organization.fields.${key}`)
}

function displayValue(row: DirectoryRow, key: string): string {
  if (key === 'branchId') {
    const id = 'branchId' in row ? row.branchId : null
    return branches.value.find((branch: Branch) => branch.id === id)?.name ?? t('common.notSet')
  }
  if (key === 'departmentId') {
    const id = 'departmentId' in row ? row.departmentId : null
    return departments.value.find((department: Department) => department.id === id)?.name ?? t('common.notSet')
  }
  if (key === 'parentId') {
    const id = 'parentId' in row ? row.parentId : null
    return departments.value.find((department: Department) => department.id === id)?.name ?? t('organization.rootDepartment')
  }
  const value = row[key as keyof DirectoryRow]
  return value === null || value === undefined || value === '' ? t('common.notSet') : String(value)
}

function openCreate() {
  editId.value = null
  formError.value = ''
  for (const field of fields.value) form[field.key] = ''
  if (props.kind === 'locations') form.radiusM = '150'
  isOpen.value = true
}

function openEdit(row: DirectoryRow) {
  editId.value = row.id
  formError.value = ''
  for (const field of fields.value) {
    const value = row[field.key as keyof DirectoryRow]
    form[field.key] = value === null || value === undefined ? '' : String(value)
  }
  isOpen.value = true
}

async function save() {
  if (saving.value) return
  formError.value = ''
  const validation = z.object({
    name: props.kind === 'positions' ? z.string().optional() : z.string().trim().min(1),
    title: props.kind === 'positions' ? z.string().trim().min(1) : z.string().optional(),
    latitude: props.kind === 'locations' ? z.coerce.number().min(-90).max(90) : z.string().optional(),
    longitude: props.kind === 'locations' ? z.coerce.number().min(-180).max(180) : z.string().optional(),
    radiusM: props.kind === 'locations' ? z.coerce.number().positive() : z.string().optional(),
  }).safeParse(form)

  if (!validation.success) {
    formError.value = validation.error.issues[0]?.message ?? t('common.invalidForm')
    return
  }

  saving.value = true
  try {
    const companyId = (await api.organization.companies.list({ limit: 1 })).items[0]?.id ?? ''
    if (props.kind === 'branches') {
      const data = {
        companyId,
        name: form.name.trim(),
        address: form.address.trim() || null,
      } satisfies Omit<Branch, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
      const repo = api.organization.branches
      if (editId.value) await repo.update(editId.value, data)
      else await repo.create(data)
    } else if (props.kind === 'departments') {
      const data = {
        branchId: form.branchId.trim() || null,
        parentId: form.parentId.trim() || null,
        name: form.name.trim(),
      } satisfies Omit<Department, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
      const repo = api.organization.departments
      if (editId.value) await repo.update(editId.value, data)
      else await repo.create(data)
    } else if (props.kind === 'positions') {
      const data = {
        departmentId: form.departmentId.trim() || null,
        title: form.title.trim(),
      } satisfies Omit<Position, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
      if (editId.value) await api.organization.positions.update(editId.value, data)
      else await api.organization.positions.create(data)
    } else {
      const data = {
        branchId: form.branchId.trim() || null,
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusM: Number(form.radiusM),
      } satisfies Omit<AttendanceLocation, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
      if (editId.value) await api.organization.attendanceLocations.update(editId.value, data)
      else await api.organization.attendanceLocations.create(data)
    }
    const operation = editId.value ? 'updated' : 'created'
    const messageKeys: Record<DirectoryKind, string> = {
      branches: `toast.branch${operation === 'created' ? 'Created' : 'Updated'}`,
      departments: `toast.department${operation === 'created' ? 'Created' : 'Updated'}`,
      positions: `toast.position${operation === 'created' ? 'Created' : 'Updated'}`,
      locations: `toast.location${operation === 'created' ? 'Created' : 'Updated'}`,
    }
    const recordName = props.kind === 'positions' ? form.title.trim() : form.name.trim()
    notify.success(t(messageKeys[props.kind]), undefined, `organization-${props.kind}-save:${editId.value ?? recordName}`)
    isOpen.value = false
    await load()
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function remove(row: DirectoryRow) {
  if (saving.value) return
  const name = 'title' in row ? row.title : row.name
  if (!window.confirm(t('common.confirmDelete', { name }))) return
  saving.value = true
  try {
    if (props.kind === 'branches') await api.organization.branches.delete(row.id)
    else if (props.kind === 'departments') await api.organization.departments.delete(row.id)
    else if (props.kind === 'positions') await api.organization.positions.delete(row.id)
    else await api.organization.attendanceLocations.delete(row.id)
    const messageKeys: Record<DirectoryKind, string> = {
      branches: 'toast.branchDeleted',
      departments: 'toast.departmentDeleted',
      positions: 'toast.positionDeleted',
      locations: 'toast.locationDeleted',
    }
    notify.success(t(messageKeys[props.kind]), undefined, `organization-${props.kind}-delete:${row.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.deleteError')
  } finally {
    saving.value = false
  }
}

function departmentDepth(department: Department): number {
  let depth = 0
  let parentId = department.parentId
  const visited = new Set<string>([department.id])
  while (parentId) {
    if (visited.has(parentId)) break
    visited.add(parentId)
    depth += 1
    parentId = departments.value.find((candidate: Department) => candidate.id === parentId)?.parentId ?? null
  }
  return depth
}

function departmentPadding(id: string): string {
  const department = departments.value.find((item: Department) => item.id === id)
  return `${Math.min(department ? departmentDepth(department) : 0, 4) * 16}px`
}

const orderedRows = computed<DirectoryRow[]>(() => {
  if (props.kind !== 'departments') return rows.value
  const ordered: Department[] = []
  const appendChildren = (parentId: string | null) => {
    departments.value
      .filter((department: Department) => department.parentId === parentId)
      .sort((left: Department, right: Department) => left.name.localeCompare(right.name))
      .forEach((department: Department) => {
        ordered.push(department)
        appendChildren(department.id)
      })
  }
  appendChildren(null)
  return ordered
})

const availableDepartments = computed(() => departments.value.filter((item: Department) => item.id !== editId.value))
const descendantDepartmentIds = computed(() => {
  if (!editId.value || props.kind !== 'departments') return new Set<string>()
  const descendants = new Set<string>()
  const visit = (parentId: string) => {
    for (const child of departments.value.filter((department: Department) => department.parentId === parentId)) {
      if (descendants.has(child.id)) continue
      descendants.add(child.id)
      visit(child.id)
    }
  }
  visit(editId.value)
  return descendants
})
const selectableDepartments = computed(() => availableDepartments.value.filter(
  (department: Department) => !descendantDepartmentIds.value.has(department.id),
))

const columns = computed(() => {
  if (props.kind === 'branches') return ['name', 'code', 'address', 'phone', 'status']
  if (props.kind === 'departments') return ['name', 'code', 'parentId', 'branchId', 'status']
  if (props.kind === 'positions') return ['title', 'code', 'departmentId', 'status']
  return ['name', 'branchId', 'latitude', 'longitude', 'radiusMeters', 'status']
})

onMounted(load)
</script>

<template>
  <div>
    <OrganizationNav />
    <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 class="text-lg font-semibold">{{ t(`organization.${titleKey}`) }}</h2>
        <button v-if="canManage" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="openCreate">
          {{ t('organization.addRecord', { name: t(`organization.${titleKey}`).toLowerCase() }) }}
        </button>
      </header>

      <div v-if="props.kind === 'locations'" class="m-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
        <p class="text-sm font-medium">{{ t('organization.mapPlaceholder') }}</p>
        <div class="mt-3 grid min-h-24 place-items-center rounded-md bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ t('organization.mapPreview') }}
        </div>
      </div>
      <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="5" :columns="columns.length + (canManage ? 1 : 0)" /></div>
      <div v-else-if="error" role="alert" class="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }}</div>
      <div v-else-if="rows.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('common.empty') }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              <th v-for="column in columns" :key="column" class="px-5 py-3">{{ fieldLabel(column) }}</th>
              <th v-if="canManage" class="px-5 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="row in orderedRows" :key="row.id">
              <td v-for="column in columns" :key="column" class="whitespace-nowrap px-5 py-3">
                <span v-if="props.kind === 'departments' && column === 'name'" :style="{ paddingLeft: departmentPadding(row.id) }">{{ displayValue(row, column) }}</span>
                <span v-else>{{ displayValue(row, column) }}</span>
              </td>
              <td v-if="canManage" class="whitespace-nowrap px-5 py-3">
                <button class="mr-3 text-emerald-700 hover:underline dark:text-emerald-400" @click="openEdit(row)">{{ t('common.edit') }}</button>
                <button :disabled="saving" class="text-red-600 hover:underline disabled:opacity-50" @click="remove(row)">{{ t('common.delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AppTransition name="motion-dialog">
    <div v-if="isOpen" class="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4" @click.self="isOpen = false">
      <section role="dialog" aria-modal="true" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-950">
        <h3 class="text-lg font-semibold">{{ t(editId ? 'common.edit' : 'common.add') }} {{ t(`organization.${titleKey}`).toLowerCase() }}</h3>
        <form class="mt-5 space-y-4" @submit.prevent="save">
          <label v-for="field in fields" :key="field.key" class="block">
            <span class="mb-1.5 block text-sm font-medium">{{ fieldLabel(field.key) }}</span>
            <AppSelect
              v-if="field.type === 'branch'"
              v-model="form[field.key]"
              :options="branches.map((branch: Branch) => ({ label: branch.name, value: branch.id }))"
              :placeholder="t('common.notSet')"
              clearable
            />
            <AppSelect
              v-else-if="field.type === 'department'"
              v-model="form[field.key]"
              :options="selectableDepartments.map((department: Department) => ({ label: department.name, value: department.id }))"
              :placeholder="field.key === 'parentId' ? t('organization.rootDepartment') : t('common.notSet')"
              clearable
            />
            <input v-else v-model="form[field.key]" :type="field.type" :required="field.required" class="form-control">
          </label>
          <div v-if="props.kind === 'locations'" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            {{ t('organization.mapPlaceholder') }}
          </div>
          <p v-if="formError" role="alert" class="text-sm text-red-600">{{ formError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" @click="isOpen = false">{{ t('common.cancel') }}</button>
            <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? t('common.saving') : t('common.save') }}</button>
          </div>
        </form>
      </section>
    </div>
    </AppTransition>
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
  outline: none;
}

.form-control:focus {
  border-color: rgb(5 150 105);
  box-shadow: 0 0 0 2px rgb(209 250 229);
}
</style>
