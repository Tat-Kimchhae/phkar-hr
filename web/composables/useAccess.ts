import type { Permission, PermissionRole, RefreshToken, Role, RoleUser, User } from '~/types'
import { useRestApi } from './useRestApi'

export function useAccess() {
  return {
    users: useRestApi<User>('users'),
    roles: useRestApi<Role>('roles'),
    permissions: useRestApi<Permission>('permissions'),
    roleUsers: useRestApi<RoleUser>('role-users'),
    permissionRoles: useRestApi<PermissionRole>('permission-roles'),
    rolePermissions: useRestApi<PermissionRole>('permission-roles'),
    refreshTokens: useRestApi<RefreshToken>('refresh-tokens'),
  }
}
