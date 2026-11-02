import { getRequestHeaders } from 'h3'
import * as data from '../data'

export interface EmployeePhotoAuth {
  employeeId: string | null
  permissions: string[]
}

export async function employeePhotoAuth(event: Parameters<typeof getRequestHeaders>[0]): Promise<EmployeePhotoAuth | null> {
  const authorization = getRequestHeaders(event).authorization
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[1]!))
  const tokenHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const token = data.refreshTokens.find(item =>
    item.tokenHash === tokenHash
    && !item.revokedAt
    && Date.parse(item.expiresAt) > Date.now(),
  )
  const user = token && data.users.find(item => item.id === token.userId && item.isActive)
  if (!user) return null

  const roleIds = data.roleUsers.filter(item => item.userId === user.id).map(item => item.roleId)
  const permissionIds = data.permissionRoles.filter(item => roleIds.includes(item.roleId)).map(item => item.permissionId)
  const permissions = data.permissions.filter(item => permissionIds.includes(item.id)).map(item => item.name)
  return { employeeId: user.employeeId, permissions }
}
