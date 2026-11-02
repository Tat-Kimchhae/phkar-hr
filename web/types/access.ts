import type { BaseRecord, JoinRecord } from './common'

export interface User extends BaseRecord {
  employeeId: string | null
  email: string
  password: string
  isActive: boolean
  lastLoginAt: string | null
}

export interface Role extends BaseRecord {
  name: string
}

export interface Permission extends BaseRecord {
  name: string
}

export interface RoleUser extends JoinRecord {
  userId: string
  roleId: string
}

export interface PermissionRole extends JoinRecord {
  roleId: string
  permissionId: string
}

export type RolePermission = PermissionRole

export interface RefreshToken extends BaseRecord {
  userId: string
  tokenHash: string
  expiresAt: string
  revokedAt: string | null
}
