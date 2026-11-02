<script setup lang="ts">
import { z } from 'zod'
import AppSelect from '~/components/app/AppSelect.vue'
import AppTransition from '~/components/app/AppTransition.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { useNotify } from '~/composables/useNotify'
import type { Employee, Permission, PermissionRole, Role, RoleUser, User } from '~/types'

type AccessSection = 'users' | 'roles' | 'permissions'

const { t } = useI18n()
const api = useHrApi()
const notify = useNotify()
const auth = useAuthStore()
const section = ref<AccessSection>('users')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const message = ref('')
const users = ref<User[]>([])
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const employees = ref<Employee[]>([])
const rolePermissionRows = ref<PermissionRole[]>([])
const roleUserRows = ref<RoleUser[]>([])
const userEdits = reactive<Record<string, { employeeId: string; roleId: string }>>({})
const matrix = reactive<Record<string, string[]>>({})
const roleDialogOpen = ref(false)
const editingRoleId = ref<string | null>(null)
const roleFormError = ref('')
const roleForm = reactive({
  name: '',
})

const roleSchema = z.object({
  name: z.string().trim().min(1),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [userPage, rolePage, permissionPage, employeePage, rolePermissionPage, roleUserPage] = await Promise.all([
      api.access.users.list({ sortBy: 'email' }),
      api.access.roles.list({ sortBy: 'name' }),
      api.access.permissions.list({ sortBy: 'name' }),
      api.employees.employees.list({ sortBy: 'employeeNo' }),
      api.access.rolePermissions.list(),
      api.access.roleUsers.list(),
    ])
    users.value = userPage.items
    roles.value = rolePage.items
    permissions.value = permissionPage.items
    employees.value = employeePage.items
    rolePermissionRows.value = rolePermissionPage.items
    roleUserRows.value = roleUserPage.items

    for (const user of users.value) {
      userEdits[user.id] = { employeeId: user.employeeId ?? '', roleId: roleUserRows.value.find((link: RoleUser) => link.userId === user.id)?.roleId ?? '' }
    }
    for (const role of roles.value) {
      const savedCodes = rolePermissionRows.value
        .filter((row: PermissionRole) => row.roleId === role.id)
        .map((row: PermissionRole) => permissions.value.find((permission: Permission) => permission.id === row.permissionId)?.name)
        .filter((code: string | undefined): code is string => Boolean(code))
      matrix[role.id] = role.name.toLowerCase() === 'admin'
        ? [...new Set([...savedCodes, 'access.manage'])]
        : savedCodes.filter((code: string) => code !== 'access.manage')
      auth.setRolePermissions(role.name.toLowerCase(), matrix[role.id]!)
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.loadError')
  } finally {
    loading.value = false
  }
}

function openRoleForm(role?: Role) {
  editingRoleId.value = role?.id ?? null
  roleFormError.value = ''
  roleForm.name = role?.name ?? ''
  roleDialogOpen.value = true
}

async function saveRole() {
  if (saving.value) return
  roleFormError.value = ''
  const result = roleSchema.safeParse(roleForm)
  if (!result.success) {
    roleFormError.value = result.error.issues[0]?.message ?? t('common.invalidForm')
    return
  }

  saving.value = true
  try {
    const duplicate = roles.value.some((role: Role) => role.name.toLowerCase() === result.data.name.toLowerCase() && role.id !== editingRoleId.value)
    if (duplicate) {
      roleFormError.value = t('access.duplicateRoleCode')
      return
    }
    const values = { name: result.data.name.trim() }
    if (editingRoleId.value) {
      await api.access.roles.update(editingRoleId.value, values)
      notify.success(t('toast.roleUpdated'), undefined, `access-role-save:${editingRoleId.value}`)
    } else {
      const created = await api.access.roles.create(values)
      matrix[created.id] = []
      notify.success(t('toast.roleCreated'), undefined, `access-role-save:${created.id}`)
    }
    roleDialogOpen.value = false
    message.value = t('access.roleSaved')
    await load()
  } catch (cause) {
    roleFormError.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function deleteRole(role: Role) {
  if (saving.value) return
  if (role.name.toLowerCase() === 'admin') {
    error.value = t('access.cannotDeleteAdmin')
    return
  }
  if (roleUserRows.value.some((link: RoleUser) => link.roleId === role.id)) {
    error.value = t('access.roleInUse')
    return
  }
  if (!window.confirm(t('common.confirmDelete', { name: role.name }))) return

  saving.value = true
  try {
    const links = await api.access.rolePermissions.list({ filter: { roleId: role.id } })
    await Promise.all(links.items.map(link => api.access.rolePermissions.removeByKey(link.roleId, link.permissionId)))
    await api.access.roles.delete(role.id)
    notify.success(t('toast.roleDeleted'), undefined, `access-role-delete:${role.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.deleteError')
  } finally {
    saving.value = false
  }
}

async function saveUser(user: User) {
  if (saving.value) return
  const edit = userEdits[user.id]
  if (!edit) return
  saving.value = true
  error.value = ''
  try {
    await api.access.users.update(user.id, {
      employeeId: edit.employeeId || null,
    })
    const currentRole = roleUserRows.value.find((link: RoleUser) => link.userId === user.id)
    if (currentRole && currentRole.roleId !== edit.roleId) await api.access.roleUsers.removeByKey(currentRole.userId, currentRole.roleId)
    if (edit.roleId && currentRole?.roleId !== edit.roleId) await api.access.roleUsers.create({ userId: user.id, roleId: edit.roleId })
    if (auth.user?.id === user.id) {
      await auth.refreshSession()
    }
    message.value = t('access.userSaved')
    notify.success(t('toast.userUpdated'), undefined, `access-user-updated:${user.id}`)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

async function toggleUserStatus(user: User) {
  if (saving.value) return
  if (auth.user?.id === user.id) {
    error.value = t('access.cannotDeactivateSelf')
    return
  }
  const isActive = !user.isActive
  saving.value = true
  try {
    await api.access.users.update(user.id, { isActive })
    user.isActive = isActive
    message.value = t(isActive ? 'access.userActivated' : 'access.userDeactivated')
    notify.success(t(isActive ? 'toast.userActivated' : 'toast.userDeactivated'), undefined, `access-user-status:${user.id}`)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.saveError')
  } finally {
    saving.value = false
  }
}

function togglePermission(roleId: string, permissionCode: string, checked: boolean) {
  const selected = matrix[roleId] ?? []
  matrix[roleId] = checked
    ? [...new Set([...selected, permissionCode])]
    : selected    .filter((code: string) => code !== permissionCode)
}

async function savePermissions() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    for (const role of roles.value) {
      const existing = await api.access.rolePermissions.list({ filter: { roleId: role.id } })
      await Promise.all(existing.items.map(row => api.access.rolePermissions.removeByKey(row.roleId, row.permissionId)))
      const selected = role.name.toLowerCase() === 'admin'
        ? [...new Set([...(matrix[role.id] ?? []), 'access.manage'])]
        : (matrix[role.id] ?? []).filter((code: string) => code !== 'access.manage')
      const links = selected.flatMap((code: string) => {
        const permission = permissions.value.find((item: Permission) => item.name === code)
        return permission ? [{
          roleId: role.id,
          permissionId: permission.id,
        }] : []
      })
      await Promise.all(links.map((link: { roleId: string; permissionId: string }) => api.access.rolePermissions.create(link)))
      auth.setRolePermissions(role.name.toLowerCase(), selected)
    }
    const updated = await api.access.rolePermissions.list()
    rolePermissionRows.value = updated.items
    message.value = t('access.permissionsSaved')
    notify.success(t('toast.permissionsSaved'), undefined, 'access-permission-matrix-saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.saveError')
    await load()
  } finally {
    saving.value = false
  }
}

function permissionLabel(code: string): string {
  return t(`access.permissions.${code.replaceAll('.', '_')}`)
}

const { pending: pagePending } = await useAsyncData('access-page-data', async () => { await load(); return true }, { lazy: true, server: false, getCachedData: () => undefined })
const showSkeleton = useDelayedPending(computed(() => !error.value && (loading.value || pagePending.value)))
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <header class="border-b border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-lg font-semibold">{{ t('pages.access') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('access.description') }}</p>
    </header>

    <nav class="flex gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800" :aria-label="t('access.sections')">
      <button
        v-for="tab in ['users', 'roles', 'permissions'] as const"
        :key="tab"
        type="button"
        class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        :class="section === tab ? '!bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300' : ''"
        @click="section = tab; message = ''; error = ''"
      >
        {{ t(`access.${tab}`) }}
      </button>
    </nav>

    <div v-if="message" role="status" class="mx-5 mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{{ message }}</div>
    <div v-if="showSkeleton && !error" class="p-5" aria-hidden="true"><SkeletonTable :rows="6" :columns="section === 'users' ? 5 : section === 'roles' ? 2 : Math.max(2, roles.length + 1)" /></div>
    <div v-else-if="error" role="alert" class="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{{ error }} <button type="button" class="ml-2 font-medium underline" @click="load">{{ t('common.retry') }}</button></div>

    <div v-else-if="section === 'users'" class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr>
            <th class="px-5 py-3">{{ t('access.user') }}</th>
            <th class="px-5 py-3">{{ t('access.employeeLink') }}</th>
            <th class="px-5 py-3">{{ t('access.role') }}</th>
            <th class="px-5 py-3">{{ t('access.status') }}</th>
            <th class="px-5 py-3">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="user in users" :key="user.id">
            <td class="px-5 py-3">
              <span class="block font-medium">{{ user.email }}</span>
              <span class="text-xs text-slate-500">{{ user.email }}</span>
            </td>
            <td class="px-5 py-3">
              <AppSelect
                v-model="userEdits[user.id]!.employeeId"
                :options="employees.map((employee: Employee) => ({ label: `${employee.firstName} ${employee.lastName} (${employee.employeeNo})`, value: employee.id }))"
                :placeholder="t('access.noEmployee')"
                clearable
              />
            </td>
            <td class="px-5 py-3">
              <AppSelect
                v-model="userEdits[user.id]!.roleId"
                :options="roles.map((role: Role) => ({ label: role.name, value: role.id }))"
              />
            </td>
            <td class="px-5 py-3">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="user.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'">{{ t(`access.userStatuses.${user.isActive ? 'active' : 'inactive'}`) }}</span>
            </td>
            <td class="whitespace-nowrap px-5 py-3">
              <button type="button" :disabled="saving" class="mr-3 text-emerald-700 hover:underline dark:text-emerald-400" @click="saveUser(user)">{{ t('common.save') }}</button>
              <button type="button" :disabled="saving" class="text-red-600 hover:underline disabled:opacity-50" @click="toggleUserStatus(user)">{{ t(user.isActive ? 'access.deactivate' : 'access.activate') }}</button>
            </td>
          </tr>
          <tr v-if="users.length === 0"><td colspan="5" class="p-8 text-center text-slate-500">{{ t('common.empty') }}</td></tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="section === 'roles'">
      <div class="flex justify-end p-5 pb-0">
        <button type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="openRoleForm()">{{ t('access.addRole') }}</button>
      </div>
      <div v-if="roles.length === 0" class="p-8 text-center text-sm text-slate-500">{{ t('common.empty') }}</div>
      <div v-else class="overflow-x-auto p-5">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr><th class="px-4 py-3">{{ t('access.role') }}</th><th class="px-4 py-3">{{ t('common.actions') }}</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="role in roles" :key="role.id">
              <td class="px-4 py-3 font-medium">{{ role.name }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <button type="button" class="mr-3 text-emerald-700 hover:underline dark:text-emerald-400" @click="openRoleForm(role)">{{ t('common.edit') }}</button>
                <button type="button" :disabled="saving" class="text-red-600 hover:underline disabled:opacity-50" @click="deleteRole(role)">{{ t('common.delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else>
      <p class="px-5 pt-5 text-sm text-slate-500">{{ t('access.permissionMatrixDescription') }}</p>
      <div class="overflow-x-auto p-5">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              <th class="sticky left-0 min-w-64 bg-slate-50 px-4 py-3 dark:bg-slate-900">{{ t('access.permission') }}</th>
              <th v-for="role in roles" :key="role.id" class="min-w-28 px-4 py-3 text-center">{{ role.name }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="permission in permissions" :key="permission.id">
              <th class="sticky left-0 bg-white px-4 py-3 font-medium dark:bg-slate-950">
                <span class="block">{{ permissionLabel(permission.name) }}</span>
                <span class="mt-0.5 block font-mono text-xs font-normal text-slate-500">{{ permission.name }}</span>
              </th>
              <td v-for="role in roles" :key="role.id" class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="(matrix[role.id] ?? []).includes(permission.name)"
                  :aria-label="`${role.name}: ${permissionLabel(permission.name)}`"
                  :disabled="saving || permission.name === 'access.manage'"
                  class="size-4 accent-emerald-600"
                  @change="togglePermission(role.id, permission.name, ($event.target as HTMLInputElement).checked)"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-end border-t border-slate-200 p-5 dark:border-slate-800">
        <button type="button" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" @click="savePermissions">{{ saving ? t('common.saving') : t('access.savePermissions') }}</button>
      </div>
    </div>
  </section>

  <AppTransition name="motion-dialog">
  <div v-if="roleDialogOpen" class="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4" @click.self="roleDialogOpen = false">
    <section role="dialog" aria-modal="true" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-950">
      <h3 class="text-lg font-semibold">{{ t(editingRoleId ? 'access.editRole' : 'access.addRole') }}</h3>
      <form class="mt-5 space-y-4" @submit.prevent="saveRole">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium">{{ t('access.roleName') }}</span>
          <input v-model="roleForm.name" required class="control">
        </label>
        <p v-if="roleFormError" role="alert" class="text-sm text-red-600">{{ roleFormError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" @click="roleDialogOpen = false">{{ t('common.cancel') }}</button>
          <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? t('common.saving') : t('common.save') }}</button>
        </div>
      </form>
    </section>
  </div>
  </AppTransition>
</template>

<style scoped>
.control {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  outline: none;
}

.control:focus {
  border-color: rgb(5 150 105);
  box-shadow: 0 0 0 2px rgb(209 250 229);
}
</style>
