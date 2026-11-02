export type AuthRole = 'admin' | 'hr' | 'manager' | 'employee'

export interface AuthenticatedUser {
  id: string
  employeeId: string | null
  name: string
  email: string
  role: string
}
