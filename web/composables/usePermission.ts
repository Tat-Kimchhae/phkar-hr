import type { Employee } from '~/types'
import type { AuthenticatedUser } from '~/types/auth'
import type { PermissionKey } from '~/utils/permissions'

export function usePermission() {
  const auth = useAuthStore()

  function can(permission: PermissionKey | string): boolean {
    if (!auth.user) return false
    const override = auth.permissionOverrides[auth.user.role]
    return (override ?? auth.permissions).includes(permission)
  }

  function canAny(...required: PermissionKey[]): boolean {
    return required.some(can)
  }

  function canViewEmployee(employee: Pick<Employee, 'id' | 'managerId'>): boolean {
    const user = auth.user
    if (!user) return false

    if (user.role === 'admin' || user.role === 'hr') return true
    if (user.role === 'manager') {
      return employee.id === user.employeeId || employee.managerId === user.employeeId
    }

    return employee.id === user.employeeId
  }

  function employeeScope(): Partial<Pick<Employee, 'id' | 'managerId'>> {
    const user = auth.user
    if (!user || user.role === 'employee') return { id: user?.employeeId ?? '' }
    if (user.role === 'manager') return { managerId: user.employeeId ?? '' }
    return {}
  }

  return {
    can,
    canAny,
    canViewEmployee,
    employeeScope,
    user: computed((): AuthenticatedUser | null => auth.user),
  }
}
