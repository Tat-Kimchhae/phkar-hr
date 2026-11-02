import type { PermissionKey } from '~/utils/permissions'
import { homeFor } from '~/stores/auth'

const routePermissions: Record<string, PermissionKey> = {
  '/dashboard': 'dashboard.view',
  '/organization': 'organization.manage',
  '/employees': 'employees.view',
  '/access': 'access.manage',
  '/leave': 'leave.view',
  '/attendance': 'attendance.view',
  '/payroll': 'payroll.manage',
  '/reports': 'reports.view',
}

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const isPublic = to.path === '/login'
  const user = auth.user

  if (!user && !isPublic) {
    if (to.path !== '/login') return navigateTo('/login')
    return
  }
  if (user && (isPublic || to.path === '/')) {
    const targetRoute = homeFor(user.role)
    if (to.path !== targetRoute) return navigateTo(targetRoute)
    return
  }
  if (!user) return

  const requiredPermission = to.path.startsWith('/organization/')
    ? 'organization.manage'
    : to.path === '/access' || to.path.startsWith('/access/')
      ? 'access.manage'
      : to.path === '/employees' || to.path.startsWith('/employees/')
        ? to.path.endsWith('/edit') || to.path.endsWith('/new')
          ? 'employees.manage'
          : 'employees.view'
      : to.path.startsWith('/payroll/payslips/')
        ? 'payroll.view'
      : to.path.startsWith('/attendance/')
        ? 'attendance.view'
        : to.path.startsWith('/payroll/')
          ? 'payroll.manage'
          : to.path.endsWith('/edit') || to.path.endsWith('/new')
            ? 'employees.manage'
            : routePermissions[to.path]
  const home = homeFor(user.role)
  if (requiredPermission && !usePermission().can(requiredPermission) && to.path !== home) {
    return navigateTo(home)
  }
})
