import { defineStore } from 'pinia'
import type { AuthenticatedUser } from '~/types/auth'

interface DemoAccount {
  name: string
  email: string
  password: string
  role: string
}

interface AuthSession {
  token: string
  user: AuthenticatedUser
  roles: string[]
  permissions: string[]
  employeeId: string | null
}

const SESSION_STORAGE_KEY = 'phkar-hr-demo-session'

export const demoAccounts: readonly DemoAccount[] = [
  { name: 'Admin User', email: 'admin@phkarhr.local', password: 'admin123', role: 'admin' },
  { name: 'HR User', email: 'hr@phkarhr.local', password: 'hr123', role: 'hr' },
  { name: 'Manager User', email: 'manager@phkarhr.local', password: 'manager123', role: 'manager' },
  { name: 'Employee User', email: 'employee@phkarhr.local', password: 'employee123', role: 'employee' },
]

export function homeFor(role: string): string {
  return role.toLowerCase() === 'employee' ? '/me' : '/dashboard'
}

function restoreSession(): AuthSession | null {
  if (!import.meta.client) return null

  const serialized = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!serialized) return null

  try {
    const value: unknown = JSON.parse(serialized)
    if (
      typeof value === 'object'
      && value !== null
      && 'token' in value && typeof value.token === 'string'
      && 'user' in value && typeof value.user === 'object' && value.user !== null
      && 'roles' in value && Array.isArray(value.roles) && value.roles.every(role => typeof role === 'string')
      && 'permissions' in value && Array.isArray(value.permissions) && value.permissions.every(permission => typeof permission === 'string')
      && 'employeeId' in value && (typeof value.employeeId === 'string' || value.employeeId === null)
    ) {
      const user = value.user
      if (
        'id' in user && typeof user.id === 'string'
        && 'employeeId' in user && (typeof user.employeeId === 'string' || user.employeeId === null)
        && 'name' in user && typeof user.name === 'string'
        && 'email' in user && typeof user.email === 'string'
        && 'role' in user && typeof user.role === 'string'
      ) {
        return {
          token: value.token,
          user: {
            id: user.id,
            employeeId: user.employeeId,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          roles: value.roles,
          permissions: value.permissions,
          employeeId: value.employeeId,
        }
      }
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
  }

  localStorage.removeItem(SESSION_STORAGE_KEY)
  return null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: restoreSession(),
    permissionOverrides: {} as Record<string, string[]>,
  }),
  getters: {
    token: state => state.session?.token ?? null,
    user: state => state.session?.user ?? null,
    roles: state => state.session?.roles ?? [],
    permissions: state => state.session?.permissions ?? [],
    employeeId: state => state.session?.employeeId ?? null,
    isAuthenticated: state => state.session !== null,
    role: state => state.session?.user.role ?? null,
  },
  actions: {
    saveSession(session: AuthSession) {
      this.session = session
      if (import.meta.client) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    },
    setRolePermissions(role: string, codes: string[]) {
      this.permissionOverrides[role] = codes
      if (this.session?.user.role === role) {
        this.session.permissions = [...codes]
        if (import.meta.client) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session))
      }
    },
    async login(email: string, password: string): Promise<boolean> {
      const config = useRuntimeConfig()
      const base = String(config.public.apiBase ?? '').replace(/\/$/, '')
      try {
        const session = await $fetch<AuthSession>(`${base}/api/auth/login`, {
          method: 'POST',
          body: { email, password },
        })
        this.saveSession(session)
        return true
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 401) {
          return false
        }
        throw error
      }
    },
    async refreshSession() {
      const token = this.token
      if (!token) return
      const config = useRuntimeConfig()
      const base = String(config.public.apiBase ?? '').replace(/\/$/, '')
      const current = await $fetch<Omit<AuthSession, 'token'>>(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      this.saveSession({ ...current, token })
    },
    async logout() {
      const config = useRuntimeConfig()
      const base = String(config.public.apiBase ?? '').replace(/\/$/, '')
      const token = this.token
      this.clearSession()
      if (token) {
        await $fetch(`${base}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    },
    clearSession() {
      this.session = null
      this.permissionOverrides = {}
      if (import.meta.client) localStorage.removeItem(SESSION_STORAGE_KEY)
    },
  },
})
