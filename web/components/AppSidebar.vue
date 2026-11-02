<script setup lang="ts">
import type { Employee } from '~/types'
import type { PermissionKey } from '~/utils/permissions'
import type { AuthRole } from '~/types/auth'

defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const { can } = usePermission()
const api = useHrApi()
const employee = ref<Employee | null>(null)
const navigation: Array<{
  key: string
  to: string
  permission: PermissionKey
  icon: string
  roles?: AuthRole[]
}> = [
  { key: 'dashboard', to: '/dashboard', permission: 'dashboard.view', icon: 'i-heroicons-squares-2x2', roles: ['admin', 'hr', 'manager'] },
  { key: 'myOverview', to: '/me', permission: 'employees.view', icon: 'i-heroicons-home', roles: ['employee'] },
  { key: 'organization', to: '/organization', permission: 'organization.manage', icon: 'i-heroicons-building-office-2' },
  { key: 'employees', to: '/employees', permission: 'employees.view', icon: 'i-heroicons-users' },
  { key: 'access', to: '/access', permission: 'access.manage', icon: 'i-heroicons-shield-check' },
  { key: 'leave', to: '/leave', permission: 'leave.view', icon: 'i-heroicons-calendar-days' },
  { key: 'attendance', to: '/attendance', permission: 'attendance.view', icon: 'i-heroicons-clock' },
  { key: 'payroll', to: '/payroll', permission: 'payroll.view', icon: 'i-heroicons-banknotes' },
  { key: 'reports', to: '/reports', permission: 'reports.view', icon: 'i-heroicons-chart-bar' },
]
const visibleNavigation = computed(() => navigation.filter((item) => {
  const role = auth.user?.role
  if (!role) return false
  if (item.roles && !item.roles.includes(role as AuthRole)) return false
  if (role === 'employee' && ['employees', 'payroll'].includes(item.key)) return false
  return item.key === 'dashboard' || can(item.permission)
}))

onMounted(async () => {
  const employeeId = auth.user?.employeeId
  if (!employeeId) return
  try {
    employee.value = await api.employees.employees.getById(employeeId)
  } catch (error) {
    console.error('Could not load the sidebar employee photo.', error)
  }
})
</script>

<template>
  <aside class="motion-sidebar fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:flex" :class="collapsed ? 'w-20' : 'w-64'">
    <div class="flex h-20 items-center justify-between gap-3 px-4">
      <div class="grid size-10 place-items-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
        P
      </div>
      <Transition name="motion-sidebar-label" mode="out-in">
        <div v-if="!collapsed" key="brand-text" class="min-w-0 flex-1">
          <p class="font-semibold tracking-tight">{{ t('app.name') }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('app.workspace') }}</p>
        </div>
      </Transition>
      <button type="button" class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="emit('toggle')">
        <UIcon :name="collapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'" class="size-4" aria-hidden="true" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 px-3 py-5" :aria-label="t('app.workspace')">
      <template v-for="item in visibleNavigation" :key="item.key">
        <NuxtLink
          :to="item.to"
          class="motion-nav-link relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          :class="collapsed ? 'justify-center px-2' : 'gap-3'"
          active-class="motion-active !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300"
          :exact="item.to === '/dashboard' || item.to === '/me'"
          :aria-label="collapsed ? t(`navigation.${item.key}`) : undefined"
          :title="collapsed ? t(`navigation.${item.key}`) : undefined"
        >
          <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          <Transition name="motion-sidebar-label" mode="out-in">
            <span v-if="!collapsed" :key="item.key">{{ t(`navigation.${item.key}`) }}</span>
          </Transition>
        </NuxtLink>
      </template>
    </nav>

    <div v-if="auth.user?.role !== 'employee'" class="border-t border-slate-200 p-4 dark:border-slate-800">
      <NuxtLink
        to="/me"
        class="flex items-center gap-3 rounded-lg p-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        :class="collapsed ? 'justify-center' : ''"
        active-class="bg-slate-100 dark:bg-slate-800"
      >
        <AppAvatar :employee="employee" :name="auth.user?.name" size="sm" />
        <span v-if="!collapsed" class="font-medium">{{ t('navigation.me') }}</span>
      </NuxtLink>
    </div>
  </aside>
</template>
