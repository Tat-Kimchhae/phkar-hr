import { createError, defineEventHandler, getMethod, getQuery, getRouterParam, getRequestHeaders, readBody, setResponseStatus } from 'h3'
import * as data from '../data'
import type { AuthenticatedUser, BaseRecord, ListResult, Payslip, PayslipItem, RefreshToken, User } from '~/types'

type DataRow = BaseRecord & Record<string, unknown>
type Collection = DataRow[]

const tables: Record<string, Collection> = {
  companies: data.companies as unknown as Collection,
  branches: data.branches as unknown as Collection,
  departments: data.departments as unknown as Collection,
  positions: data.positions as unknown as Collection,
  employees: data.employees as unknown as Collection,
  'employee-documents': data.employeeDocuments as unknown as Collection,
  contracts: data.contracts as unknown as Collection,
  'emergency-contacts': data.emergencyContacts as unknown as Collection,
  'employee-bank-accounts': data.employeeBankAccounts as unknown as Collection,
  'employee-dependents': data.employeeDependents as unknown as Collection,
  settings: data.settings as unknown as Collection,
  users: data.users as unknown as Collection,
  roles: data.roles as unknown as Collection,
  permissions: data.permissions as unknown as Collection,
  'role-users': data.roleUsers as unknown as Collection,
  'permission-roles': data.permissionRoles as unknown as Collection,
  'refresh-tokens': data.refreshTokens as unknown as Collection,
  'leave-types': data.leaveTypes as unknown as Collection,
  'leave-balances': data.leaveBalances as unknown as Collection,
  'leave-balance-summaries': [],
  'leave-requests': data.leaveRequests as unknown as Collection,
  holidays: data.holidays as unknown as Collection,
  'attendance-locations': data.attendanceLocations as unknown as Collection,
  'attendance-logs': data.attendanceLogs as unknown as Collection,
  'attendance-corrections': data.attendanceCorrections as unknown as Collection,
  'attendance-summary': [],
  'overtime-records': data.overtimeRecords as unknown as Collection,
  'push-tokens': data.pushTokens as unknown as Collection,
  notifications: data.notifications as unknown as Collection,
  'salary-structures': data.salaryStructures as unknown as Collection,
  'employee-salaries': data.employeeSalaries as unknown as Collection,
  allowances: data.allowances as unknown as Collection,
  'employee-allowances': data.employeeAllowances as unknown as Collection,
  deductions: data.deductions as unknown as Collection,
  'employee-deductions': data.employeeDeductions as unknown as Collection,
  'payroll-periods': data.payrollPeriods as unknown as Collection,
  'payroll/runs': data.payrollRuns as unknown as Collection,
  payslips: data.payslips as unknown as Collection,
  'payslip-items': data.payslipItems as unknown as Collection,
  'tax-rules': data.taxRules as unknown as Collection,
  'social-security-rules': data.socialSecurityRules as unknown as Collection,
  'employee-loans': data.employeeLoans as unknown as Collection,
  'payroll-adjustments': data.payrollAdjustments as unknown as Collection,
  'exchange-rates': data.exchangeRates as unknown as Collection,
}

let sequence = 2000
const now = () => new Date().toISOString()
const fail = (statusCode: number, message: string): never => {
  throw createError({ statusCode, statusMessage: message, message })
}

interface AuthContext {
  user: User
  role: string
  roles: string[]
  permissions: string[]
  employeeId: string | null
  tokenRecord: RefreshToken
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function authContext(headers: Record<string, string | undefined>): Promise<AuthContext | null> {
  const authorization = headers.authorization
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  const tokenHash = await hashToken(match[1]!)
  const tokenRecord = data.refreshTokens.find(record =>
    record.tokenHash === tokenHash
      && !record.revokedAt
      && Date.parse(record.expiresAt) > Date.now(),
  )
  if (!tokenRecord) return null
  const user = data.users.find(record => record.id === tokenRecord.userId && record.isActive)
  if (!user) return null

  const roleIds = data.roleUsers.filter(link => link.userId === user.id).map(link => link.roleId)
  const roles = roleIds.map(id => data.roles.find(role => role.id === id)?.name).filter((name): name is string => Boolean(name))
  const permissionIds = data.permissionRoles.filter(link => roleIds.includes(link.roleId)).map(link => link.permissionId)
  const permissions = data.permissions.filter(permission => permissionIds.includes(permission.id)).map(permission => permission.name)
  const role = roles[0]?.toLowerCase()
  if (!role) return null
  return { user, role, roles, permissions, employeeId: user.employeeId, tokenRecord }
}

function sessionPayload(context: AuthContext) {
  const employee = data.employees.find(record => record.id === context.employeeId)
  const user: AuthenticatedUser = {
    id: context.user.id,
    employeeId: context.employeeId,
    name: employee ? `${employee.firstName} ${employee.lastName}` : 'Admin User',
    email: context.user.email,
    role: context.role,
  }
  return { user, roles: context.roles, permissions: context.permissions, employeeId: context.employeeId }
}

function visibleEmployeeIds(context: AuthContext): Set<string> | null {
  if (context.role === 'admin' || context.role === 'hr') return null
  if (!context.employeeId) return new Set()
  const visible = new Set([context.employeeId])
  if (context.role === 'manager') {
    for (const employee of data.employees) {
      if (employee.managerId === context.employeeId) visible.add(employee.id)
    }
  }
  return visible
}

function rowIsVisible(resource: string, row: DataRow, context: AuthContext): boolean {
  if (resource === 'notifications') return row.userId === context.user.id
  const ids = visibleEmployeeIds(context)
  if (!ids) return true
  if (resource === 'employees') return ids.has(row.id)
  if (typeof row.employeeId === 'string') return ids.has(row.employeeId)
  if (resource === 'payslip-items' && typeof row.payslipId === 'string') {
    const payslip = data.payslips.find(item => item.id === row.payslipId)
    return Boolean(payslip && ids.has(payslip.employeeId))
  }
  if (typeof row.id === 'string' && ['users'].includes(resource)) {
    const user = data.users.find(item => item.id === row.id)
    return Boolean(user?.employeeId && ids.has(user.employeeId))
  }
  return true
}

function requiredPermission(resource: string, method: string, path: string[]): string | null {
  const action = path[1]
  if (resource === 'auth') return null
  if (resource === 'payroll/runs') return 'payroll.manage'
  if (resource.startsWith('payroll')) return method === 'GET' ? 'payroll.view' : 'payroll.manage'
  if (['users', 'roles', 'permissions', 'role-users', 'permission-roles'].includes(resource)) return 'access.manage'
  if (['companies', 'branches', 'departments', 'positions', 'settings', 'attendance-locations'].includes(resource)) return 'organization.manage'
  if (['employees', 'employee-documents', 'contracts', 'emergency-contacts', 'employee-bank-accounts', 'employee-dependents', 'employee-salaries', 'employee-allowances', 'employee-deductions', 'employee-loans'].includes(resource)) {
    return method === 'GET' ? 'employees.view' : 'employees.manage'
  }
  if (['leave-types', 'leave-balances', 'leave-balance-summaries', 'leave-requests', 'holidays'].includes(resource)) {
    if (resource === 'leave-requests' && ['approve', 'reject'].includes(action ?? '')) return 'leave.manage'
    if (resource === 'leave-requests' && action === 'cancel') return 'leave.view'
    return method === 'GET' || (resource === 'leave-requests' && method === 'POST' && !path[0]) ? 'leave.view' : 'leave.manage'
  }
  if (['attendance-logs', 'attendance-corrections', 'overtime-records', 'attendance-summary'].includes(resource)) {
    if (['approve', 'reject'].includes(action ?? '')) return 'attendance.manage'
    if (resource === 'attendance-logs' && method === 'PATCH') return 'attendance.manage'
    return method === 'GET' || method === 'POST' ? 'attendance.view' : 'attendance.manage'
  }
  if (resource === 'push-tokens') return 'dashboard.view'
  return null
}

function findRow(items: Collection, id: string): DataRow | undefined {
  return items.find(item => item.id === id)
}

function assertColumns(resource: string, values: Record<string, unknown>, sample?: DataRow) {
  const allowed = new Set([
    'id', 'createdAt', 'updatedAt', 'deletedAt',
    ...Object.keys(sample ?? {}),
  ])
  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) fail(422, `Unknown field "${key}" for ${resource}.`)
  }
}

function scoped(resource: string, rows: Collection, context: AuthContext) {
  const ids = visibleEmployeeIds(context)
  return ids ? rows.filter(item => rowIsVisible(resource, item, context)) : rows
}

function payrollLocked(record: DataRow): boolean {
  const runId = record.id
  const run = data.payrollRuns.find(item => item.id === runId)
  if (run?.status === 'locked') return true
  if (record.payrollRunId) return data.payrollRuns.some(item => item.id === record.payrollRunId && item.status === 'locked')
  if (record.payslipId) {
    const slip = data.payslips.find(item => item.id === record.payslipId)
    return Boolean(slip && data.payrollRuns.some(item => item.id === slip.payrollRunId && item.status === 'locked'))
  }
  return false
}

function calculateTax(income: number): number {
  const brackets = [...data.taxRules].sort((a, b) => a.bracketMin - b.bracketMin)
  return brackets.reduce((sum, bracket) => {
    if (income <= bracket.bracketMin) return sum
    const upper = bracket.bracketMax === null ? income : Math.min(income, bracket.bracketMax)
    return sum + Math.max(0, upper - bracket.bracketMin) * bracket.rate
  }, 0)
}

export default defineEventHandler(async (event) => {
  const segments = (getRouterParam(event, 'path') ?? '').split('/').filter(Boolean)
  const method = getMethod(event)
  const headers = getRequestHeaders(event)

  if (segments[0] === 'auth' && segments[1] === 'login' && method === 'POST') {
    const body = await readBody<{ email?: string; password?: string }>(event)
    if (!body.email || !body.password) return fail(422, 'email and password are required.')
    const user = data.users.find(record => record.email.toLowerCase() === body.email!.trim().toLowerCase()
      && record.password === body.password)
    if (!user?.isActive) return fail(401, 'Invalid email or password.')

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const tokenRecord: RefreshToken = {
      id: String(++sequence),
      userId: user.id,
      tokenHash: await hashToken(token),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
      createdAt: now(),
      updatedAt: now(),
    }
    data.refreshTokens.push(tokenRecord)
    const context = await authContext({ authorization: `Bearer ${token}` })
    if (!context) return fail(401, 'Unable to create an authenticated session.')
    user.lastLoginAt = now()
    user.updatedAt = now()
    setResponseStatus(event, 200)
    return { token, ...sessionPayload(context) }
  }

  const context = await authContext(headers)
  if (!context) return fail(401, 'A valid Bearer token is required.')
  if (segments[0] === 'auth' && segments[1] === 'me' && method === 'GET') return sessionPayload(context)
  if (segments[0] === 'auth' && segments[1] === 'logout' && method === 'POST') {
    context.tokenRecord.revokedAt = now()
    context.tokenRecord.updatedAt = now()
    return { ok: true }
  }

  let resource: string
  let path: string[]
  if (segments[0] === 'payroll' && segments[1] === 'runs') {
    resource = 'payroll/runs'
    path = segments.slice(2)
  } else {
    resource = segments[0] ?? ''
    path = segments.slice(1)
  }
  const items = tables[resource]
  if (!items) return fail(404, `Unknown API resource "${resource}".`)
  const id = path[0]
  const action = path[1] ?? (resource === 'payroll/runs' && id === 'preview' ? 'preview' : undefined)
  const permission = requiredPermission(resource, method, path)
  if (permission && !context.permissions.includes(permission)) return fail(403, `Missing permission: ${permission}.`)

  if (resource === 'notifications' && method === 'POST' && id === 'read-all' && !action) {
    const readAt = now()
    let updated = 0
    for (const notification of items) {
      if (notification.userId === context.user.id && !notification.readAt) {
        notification.readAt = readAt
        notification.updatedAt = readAt
        updated += 1
      }
    }
    return { updated, unread: 0 }
  }

  if (resource === 'notifications' && (method === 'POST' || method === 'DELETE' || method === 'PUT')) {
    return fail(405, 'Method not allowed.')
  }

  if (method === 'POST' && id && action && action !== 'preview') {
    if (resource === 'payroll/runs') {
      const run = findRow(items, id)
      if (!run) return fail(404, 'Payroll run not found.')
      if (action === 'approve' && run.status === 'processing') {
        run.status = 'completed'
        run.approvedBy = context.user.id
      } else if (action === 'lock' && run.status === 'completed') {
        run.status = 'locked'
        run.lockedAt = now()
      } else return fail(422, `Cannot ${action} a payroll run in ${String(run.status)} state.`)
      run.updatedAt = now()
      return run
    }
    if (resource === 'leave-requests' && ['approve', 'reject', 'cancel'].includes(action)) {
      const request = findRow(items, id)
      if (!request || !rowIsVisible(resource, request, context)) return fail(404, 'Leave request not found.')
      if (request.status !== 'pending') return fail(422, 'Only pending leave requests can be changed.')
      if (action === 'approve') {
        request.status = 'approved'
        request.approvedBy = context.user.id
        request.approvedAt = now()
        const balance = data.leaveBalances.find(item => item.employeeId === request.employeeId && item.leaveTypeId === request.leaveTypeId && item.year === Number(String(request.startDate).slice(0, 4)))
        if (balance) balance.used += Number(request.days)
      } else if (action === 'reject') request.status = 'rejected'
      else {
        request.status = 'cancelled'
        request.cancelledAt = now()
      }
      request.updatedAt = now()
      return request
    }
    if (resource === 'attendance-corrections' && ['approve', 'reject'].includes(action)) {
      const correction = findRow(items, id)
      if (!correction || !rowIsVisible(resource, correction, context)) return fail(404, 'Attendance correction not found.')
      if (correction.status !== 'pending') return fail(422, 'Only pending corrections can be decided.')
      correction.status = action === 'approve' ? 'approved' : 'rejected'
      correction.decidedBy = context.user.id
      correction.decidedAt = now()
      if (action === 'approve') {
        const log = data.attendanceLogs.find(item => item.id === correction.attendanceLogId)
        if (log) {
          log.checkIn = typeof correction.requestedCheckIn === 'string' ? correction.requestedCheckIn : null
          log.checkOut = typeof correction.requestedCheckOut === 'string' ? correction.requestedCheckOut : null
          log.reason = typeof correction.reason === 'string' ? correction.reason : null
          log.editedBy = context.user.id
          log.method = 'manual'
        }
      }
      correction.updatedAt = now()
      return correction
    }
    if (resource === 'overtime-records' && ['approve', 'reject'].includes(action)) {
      const record = findRow(items, id)
      if (!record || !rowIsVisible(resource, record, context)) return fail(404, 'Overtime record not found.')
      if (record.status !== 'pending') return fail(422, 'Only pending overtime records can be decided.')
      record.status = action === 'approve' ? 'approved' : 'rejected'
      record.approvedBy = action === 'approve' ? context.user.id : null
      record.updatedAt = now()
      return record
    }
    return fail(404, 'Action not found.')
  }

  if (resource === 'payroll/runs' && method === 'POST' && id === 'preview') {
    const body = await readBody<{ periodId?: string }>(event)
    if (!body.periodId) return fail(422, 'periodId is required.')
    const period = data.payrollPeriods.find(item => item.id === body.periodId)
    if (!period) return fail(404, 'Payroll period not found.')
    const preview = data.employees.filter(employee => employee.status === 'active').map(employee => {
      const salary = data.employeeSalaries.find(item => item.employeeId === employee.id && item.effectiveFrom <= period.endDate && (!item.effectiveTo || item.effectiveTo >= period.startDate))
      const base = salary?.baseSalary ?? 0
      const allowances = data.employeeAllowances.filter(item => item.employeeId === employee.id && item.effectiveFrom <= period.endDate && (!item.effectiveTo || item.effectiveTo >= period.startDate)).reduce((sum, item) => sum + item.amount, 0)
      const overtimeRows = data.overtimeRecords.filter(item => item.employeeId === employee.id && item.status === 'approved' && item.workDate >= period.startDate && item.workDate <= period.endDate)
      const overtime = overtimeRows.reduce((sum, item) => sum + item.hours * item.rateMultiplier * base / 176, 0)
      const deductions = data.employeeDeductions.filter(item => item.employeeId === employee.id && item.effectiveFrom <= period.endDate && (!item.effectiveTo || item.effectiveTo >= period.startDate)).reduce((sum, item) => sum + item.amount, 0)
      const gross = base + allowances + overtime
      const rule = data.socialSecurityRules[0]
      const social = rule ? Math.min(gross, rule.salaryCap) * rule.employeeRate : 0
      const tax = calculateTax(gross)
      const lines = [
        { itemType: 'earning' as const, label: 'Base salary', quantity: null, rate: null, amount: base },
        ...data.employeeAllowances.filter(item => item.employeeId === employee.id).map(item => ({
          itemType: 'earning' as const,
          label: data.allowances.find(allowance => allowance.id === item.allowanceId)?.name ?? 'Allowance',
          quantity: null,
          rate: null,
          amount: item.amount,
        })),
        ...overtimeRows.map(item => ({ itemType: 'earning' as const, label: `Approved overtime (${item.workDate})`, quantity: item.hours, rate: item.rateMultiplier, amount: item.hours * item.rateMultiplier * base / 176 })),
        { itemType: 'deduction' as const, label: 'Deductions', quantity: null, rate: null, amount: deductions },
        { itemType: 'deduction' as const, label: 'Social security (demo)', quantity: null, rate: rule?.employeeRate ?? 0, amount: social },
        { itemType: 'deduction' as const, label: 'Tax (demo)', quantity: null, rate: null, amount: tax },
      ]
      const totalDeductions = deductions + social + tax
      return {
        employee,
        employeeId: employee.id,
        currency: salary?.currency ?? 'USD',
        grossAmount: gross,
        totalDeductions,
        netAmount: gross - totalDeductions,
        lines,
        baseSalary: base,
        allowances,
        overtime,
        gross,
        deductions,
        socialSecurity: social,
        tax,
        net: gross - totalDeductions,
      }
    })
    return { items: preview, total: preview.length }
  }

  if (resource === 'payroll/runs' && method === 'POST' && !id) {
    const body = await readBody<{ periodId?: string }>(event)
    if (!body.periodId) return fail(422, 'periodId is required.')
    if (data.payrollRuns.some(run => run.periodId === body.periodId && run.status !== 'cancelled')) return fail(422, 'A run already exists for this period.')
    const preview = await $fetch<{ items: Array<Record<string, unknown>> }>(`/api/payroll/runs/preview`, {
      method: 'POST',
      body,
      headers: { authorization: headers.authorization ?? '' },
    })
    const run = { id: String(++sequence), createdAt: now(), updatedAt: now(), periodId: body.periodId, runBy: context.user.id, runAt: now(), status: 'processing', approvedBy: null, lockedAt: null } as DataRow
    items.push(run)
    for (const entry of preview.items) {
      const payslip: Payslip = {
        id: String(++sequence), createdAt: now(), updatedAt: now(), payrollRunId: run.id,
        employeeId: String(entry.employeeId), gross: Number(entry.gross),
        totalDeductions: Number(entry.deductions) + Number(entry.socialSecurity) + Number(entry.tax),
        net: Number(entry.net), currency: 'USD', workingDays: 22, absentDays: 0,
        otHours: Number(entry.overtime), status: 'processing', paidAt: null, pdfPath: null,
      }
      data.payslips.push(payslip)
      const earning: PayslipItem = { id: String(++sequence), createdAt: now(), updatedAt: now(), payslipId: payslip.id, type: 'earning', name: 'Gross earnings', amount: Number(entry.gross) }
      const deduction: PayslipItem = { id: String(++sequence), createdAt: now(), updatedAt: now(), payslipId: payslip.id, type: 'deduction', name: 'Total deductions', amount: payslip.totalDeductions }
      const lineItems = Array.isArray(entry.lines) ? entry.lines as Array<Record<string, unknown>> : []
      for (const line of lineItems) {
        const payslipItem: PayslipItem = {
          id: String(++sequence),
          createdAt: now(),
          updatedAt: now(),
          payslipId: payslip.id,
          type: String(line.itemType),
          name: String(line.label),
          amount: Number(line.amount),
        }
        data.payslipItems.push(payslipItem)
      }
    }
    setResponseStatus(event, 201)
    return run
  }

  if (method === 'GET' && !id) {
    const query = getQuery(event)
    if (resource === 'notifications') {
      const page = Math.max(1, Number(query.page ?? 1))
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)))
      const unreadFilter = query.unread === 'true' ? true : query.unread === 'false' ? false : undefined
      const userNotifications = items
        .filter(item => item.userId === context.user.id)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      const unread = userNotifications.filter(item => !item.readAt).length
      const filtered = unreadFilter === undefined
        ? userNotifications
        : userNotifications.filter(item => Boolean(item.readAt) !== unreadFilter)
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        unread,
      }
    }
    if (resource === 'attendance-summary') {
      const month = typeof query.month === 'string' ? query.month : String(query.date ?? new Date().toISOString().slice(0, 7))
      const today = typeof query.date === 'string' ? query.date : new Date().toISOString().slice(0, 10)
      const start = `${month.slice(0, 7)}-01`
      const monthEnd = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
      const end = month.slice(0, 7) === today.slice(0, 7) ? today : monthEnd
      const employeeRows = scoped('employees', data.employees as unknown as Collection, context)
      const config = data.settings[0]
      if (!config) return fail(422, 'Company work settings are required.')
      const records = employeeRows.map((employee) => {
        let onTime = 0
        let late = 0
        let absent = 0
        let onLeave = 0
        let workedHours = 0
        const byDate: Array<{ date: string; status: string; checkIn: string | null }> = []
        for (let cursor = new Date(`${start}T00:00:00Z`); cursor <= new Date(`${end}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
          const date = cursor.toISOString().slice(0, 10)
          const weekday = cursor.getUTCDay()
          const isWorkDay = config.workWeek.split(',').map(Number).includes(weekday)
            && !data.holidays.some(holiday => holiday.companyId === employee.companyId && holiday.holidayDate === date)
          const leave = data.leaveRequests.some(request => request.employeeId === employee.id
            && request.status === 'approved' && request.startDate <= date && request.endDate >= date)
          const log = data.attendanceLogs.find(item => item.employeeId === employee.id && item.workDate === date)
          let status = 'not_scheduled'
          if (isWorkDay && leave) {
            status = 'on_leave'
            onLeave += 1
          } else if (isWorkDay && log?.checkIn) {
            const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(log.checkIn))
            const [hour, minute] = time.split(':').map(Number)
            const [startHour, startMinute] = config.workStartTime.split(':').map(Number)
            if (hour * 60 + minute > startHour! * 60 + startMinute! + config.graceMinutes) {
              status = 'late'
              late += 1
            } else {
              status = 'on_time'
              onTime += 1
            }
            if (log.checkOut) workedHours += Math.max(0, (Date.parse(log.checkOut) - Date.parse(log.checkIn)) / 3_600_000)
          } else if (isWorkDay) {
            status = 'absent'
            absent += 1
          }
          byDate.push({ date, status, checkIn: log?.checkIn ?? null })
        }
        return { employee, onTime, late, absent, onLeave, workedHours, days: byDate }
      })
      if (typeof query.date === 'string') {
        return {
          items: records.map(item => ({
            employee: item.employee,
            status: item.days.find(day => day.date === query.date)?.status ?? 'not_scheduled',
            checkIn: item.days.find(day => day.date === query.date)?.checkIn ?? null,
          })),
          total: records.length,
        }
      }
      return { items: records.map(({ days: _days, ...summary }) => summary), total: records.length }
    }

    if (resource === 'leave-balance-summaries') {
      const employeeId = typeof query.employeeId === 'string' ? query.employeeId : ''
      const year = Number(query.year ?? new Date().getFullYear())
      const visibleBalances = scoped('leave-balances', data.leaveBalances as unknown as Collection, context)
      const visibleEmployeeIds = new Set(visibleBalances.map(balance => String(balance.employeeId)))
      const items = data.leaveBalances.filter(balance => visibleEmployeeIds.has(balance.employeeId)
        && (!employeeId || balance.employeeId === employeeId) && balance.year === year)
        .map((balance) => {
          const pendingDays = data.leaveRequests
            .filter(request => request.employeeId === balance.employeeId && request.leaveTypeId === balance.leaveTypeId && request.status === 'pending')
            .reduce((sum, request) => sum + request.days, 0)
          return { ...balance, pendingDays, remaining: Math.max(0, balance.entitled - balance.used - pendingDays) }
        })
      return { items, total: items.length }
    }
    const page = Math.max(1, Number(query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)))
    let result = scoped(resource, items, context)
    const filters = typeof query.filters === 'string' ? JSON.parse(query.filters) as Record<string, string> : {}
    for (const [key, value] of Object.entries({ ...query, ...filters })) {
      if (['page', 'pageSize', 'search', 'sort', 'sortDirection', 'filters'].includes(key) || value === undefined) continue
      result = result.filter(item => String(item[key] ?? '') === String(value))
    }
    if (typeof query.search === 'string') {
      const term = query.search.toLowerCase()
      result = result.filter(item => Object.values(item).some(value => String(value ?? '').toLowerCase().includes(term)))
    }
    if (typeof query.sort === 'string') {
      const direction = query.sortDirection === 'desc' ? -1 : 1
      result = [...result].sort((a, b) => String(a[query.sort as string] ?? '').localeCompare(String(b[query.sort as string] ?? '')) * direction)
    }
    const response: ListResult<DataRow> = { items: result.slice((page - 1) * pageSize, page * pageSize), total: result.length }
    return response
  }

  if (method === 'GET' && id) {
    const item = findRow(items, id)
    if (!item || !rowIsVisible(resource, item, context)) return fail(404, 'Record not found.')
    return item
  }

  if (method === 'POST') {
    const body = await readBody<Record<string, unknown>>(event)
    if (typeof body.employeeId === 'string') {
      const visibleIds = visibleEmployeeIds(context)
      if (visibleIds && !visibleIds.has(body.employeeId)) return fail(403, 'You cannot create records for this employee.')
    }
    const emptyResourceColumns: Record<string, string[]> = {
      'refresh-tokens': ['userId', 'tokenHash', 'expiresAt', 'revokedAt'],
      'push-tokens': ['userId', 'token', 'platform'],
    }
    const sample = items[0] ?? Object.fromEntries((emptyResourceColumns[resource] ?? []).map(key => [key, null])) as DataRow
    assertColumns(resource, body, sample)
    if (resource === 'leave-requests' && typeof body.startDate === 'string' && typeof body.endDate === 'string' && body.endDate < body.startDate) return fail(422, 'endDate must not precede startDate.')
    if (resource === 'payslips' && typeof body.payrollRunId === 'string' && data.payrollRuns.some(run => run.id === body.payrollRunId && run.status === 'locked')) return fail(422, 'Locked payroll runs are read-only.')
    if (resource === 'payslip-items' && typeof body.payslipId === 'string') {
      const slip = data.payslips.find(item => item.id === body.payslipId)
      if (slip && data.payrollRuns.some(run => run.id === slip.payrollRunId && run.status === 'locked')) return fail(422, 'Locked payroll runs are read-only.')
    }
    const item = (resource === 'role-users' || resource === 'permission-roles')
      ? { createdAt: now(), updatedAt: now(), ...body } as unknown as DataRow
      : { id: String(++sequence), createdAt: now(), updatedAt: now(), ...body } as DataRow
    items.push(item)
    setResponseStatus(event, 201)
    return item
  }

  if (method === 'PATCH' && id) {
    const item = findRow(items, id)
    if (!item || !rowIsVisible(resource, item, context)) return fail(404, 'Record not found.')
    if (payrollLocked(item)) return fail(422, 'Locked payroll records are read-only.')
    const body = await readBody<Record<string, unknown>>(event)
    if (resource === 'notifications') {
      if (Object.keys(body).length !== 1 || typeof body.readAt !== 'string' || !Number.isFinite(Date.parse(body.readAt))) {
        return fail(422, 'A valid readAt timestamp is required.')
      }
      item.readAt = body.readAt
      item.updatedAt = now()
      return item
    }
    assertColumns(resource, body, item)
    Object.assign(item, body, { updatedAt: now() })
    return item
  }

  if (method === 'DELETE' && id) {
    if ((resource === 'role-users' || resource === 'permission-roles') && action) {
      const keys = resource === 'role-users' ? ['userId', 'roleId'] : ['roleId', 'permissionId']
      const index = items.findIndex(item => item[keys[0]!] === id && item[keys[1]!] === action)
      if (index < 0) return fail(404, 'Join record not found.')
      items.splice(index, 1)
      setResponseStatus(event, 204)
      return null
    }
    const index = items.findIndex(item => item.id === id)
    if (index < 0 || !rowIsVisible(resource, items[index]!, context)) return fail(404, 'Record not found.')
    if (payrollLocked(items[index]!)) return fail(422, 'Locked payroll records are read-only.')
    items.splice(index, 1)
    setResponseStatus(event, 204)
    return null
  }

  return fail(405, 'Method not allowed.')
})
