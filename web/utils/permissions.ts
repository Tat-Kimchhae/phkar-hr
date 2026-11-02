import type { AuthRole } from '~/types/auth'

export const permissions = [
  'organization.manage',
  'employees.view',
  'employees.manage',
  'employees.update',
  'access.manage',
  'leave.view',
  'leave.manage',
  'attendance.view',
  'attendance.manage',
  'payroll.view',
  'payroll.manage',
  'reports.view',
  'dashboard.view',
] as const

export type PermissionKey = typeof permissions[number]

const rolePermissions: Record<AuthRole, readonly PermissionKey[]> = {
  admin: permissions,
  hr: permissions.filter(permission => permission !== 'access.manage'),
  manager: [
    'dashboard.view',
    'employees.view',
    'leave.view',
    'leave.manage',
    'attendance.view',
    'attendance.manage',
    'reports.view',
  ],
  employee: [
    'employees.view',
    'leave.view',
    'attendance.view',
    'payroll.view',
  ],
}

export function roleHasPermission(role: string, permission: PermissionKey): boolean {
  return Object.prototype.hasOwnProperty.call(rolePermissions, role)
    && rolePermissions[role as AuthRole].includes(permission)
}
