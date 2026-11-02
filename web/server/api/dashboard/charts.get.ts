import { createError, defineEventHandler, getQuery, getRequestHeaders } from 'h3'
import * as data from '../../data'
import type { Employee, PayrollPeriod } from '~/types'

const unauthorized = () => { throw createError({ statusCode: 401, statusMessage: 'A valid Bearer token is required.' }) }

export default defineEventHandler(async (event) => {
  const token = getRequestHeaders(event).authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return unauthorized()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const tokenHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const tokenRecord = data.refreshTokens.find(record => record.tokenHash === tokenHash && !record.revokedAt && Date.parse(record.expiresAt) > Date.now())
  const user = tokenRecord && data.users.find(record => record.id === tokenRecord.userId && record.isActive)
  if (!user) return unauthorized()

  const roleIds = data.roleUsers.filter(link => link.userId === user.id).map(link => link.roleId)
  const role = data.roles.find(record => roleIds.includes(record.id))?.name.toLowerCase()
  if (!role) return unauthorized()
  const employeeId = user.employeeId
  const ids = role === 'admin' || role === 'hr'
    ? null
    : new Set(employeeId
        ? [employeeId, ...(role === 'manager' ? data.employees.filter(employee => employee.managerId === employeeId).map(employee => employee.id) : [])]
        : [])
  const employees = data.employees.filter(employee => employee.status === 'active' && (!ids || ids.has(employee.id)))
  const employeeIds = new Set(employees.map(employee => employee.id))
  const query = getQuery(event)
  const requestedDays = Number(query.days ?? 14)
  const days = [7, 14, 30].includes(requestedDays) ? requestedDays : 14
  const today = new Date()
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1 + index))
    return date.toISOString().slice(0, 10)
  })
  const settings = data.settings[0]!
  const attendance = { labels: dates, onTime: Array(days).fill(0) as number[], late: Array(days).fill(0) as number[], absent: Array(days).fill(0) as number[], onLeave: Array(days).fill(0) as number[] }
  dates.forEach((date, dateIndex) => {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay()
    const scheduled = settings.workWeek.split(',').map(Number).includes(day)
      && !data.holidays.some(holiday => holiday.holidayDate === date)
    if (!scheduled) return
    for (const employee of employees) {
      const leave = data.leaveRequests.some(request => request.employeeId === employee.id && request.status === 'approved' && request.startDate <= date && request.endDate >= date)
      if (leave) { attendance.onLeave[dateIndex] += 1; continue }
      const log = data.attendanceLogs.find(record => record.employeeId === employee.id && record.workDate === date && record.checkIn)
      if (!log?.checkIn) { attendance.absent[dateIndex] += 1; continue }
      const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(log.checkIn))
      const [hour, minute] = time.split(':').map(Number)
      const [startHour, startMinute] = settings.workStartTime.split(':').map(Number)
      if (hour! * 60 + minute! > startHour! * 60 + startMinute! + settings.graceMinutes) attendance.late[dateIndex] += 1
      else attendance.onTime[dateIndex] += 1
    }
  })

  const own = role === 'employee'
  const totalsBy = (key: 'departmentId' | 'branchId') => {
    const groups = new Map<string, number>()
    employees.forEach(employee => { if (employee[key]) groups.set(employee[key]!, (groups.get(employee[key]!) ?? 0) + 1) })
    const source = key === 'departmentId' ? data.departments : data.branches
    return { labels: [...groups.keys()].map(id => source.find(item => item.id === id)?.name ?? id), values: [...groups.values()], total: employees.length }
  }
  const year = today.getUTCFullYear()
  const leaveTypes = own ? [] : data.leaveTypes
  const leaveDaysByType = leaveTypes.map(type => ({ label: type.name, value: data.leaveRequests.filter(request => employeeIds.has(request.employeeId) && request.leaveTypeId === type.id && request.status === 'approved' && request.startDate.startsWith(String(year))).reduce((sum, request) => sum + request.days, 0) }))
  const ownLeave = own ? data.leaveBalances.filter(balance => balance.employeeId === employeeId && balance.year === year).map(balance => ({ label: data.leaveTypes.find(type => type.id === balance.leaveTypeId)?.name ?? '', used: balance.used, remaining: Math.max(0, balance.entitled - balance.used) })) : []
  const payrollPeriods = data.payrollPeriods.filter((period: PayrollPeriod) => data.payrollRuns.some(run => run.periodId === period.id && run.status !== 'cancelled')).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(-12)
  const payroll = role === 'admin' || role === 'hr' ? payrollPeriods.map(period => {
    const run = data.payrollRuns.find(item => item.periodId === period.id && item.status !== 'cancelled')
    const slips = data.payslips.filter(slip => slip.payrollRunId === run?.id && employeeIds.has(slip.employeeId))
    return { label: period.startDate.slice(0, 7), gross: slips.reduce((sum, slip) => sum + slip.gross, 0), net: slips.reduce((sum, slip) => sum + slip.net, 0) }
  }) : []
  const hires = role === 'admin' || role === 'hr' ? Array.from({ length: 12 }, (_, index) => {
    const month = new Date(Date.UTC(year, today.getUTCMonth() - 11 + index, 1)).toISOString().slice(0, 7)
    return { label: month, value: employees.filter((employee: Employee) => employee.hireDate.startsWith(month)).length }
  }) : []

  return { attendance, departmentHeadcount: own ? null : totalsBy('departmentId'), leaveDaysByType, ownLeave, payroll, hires }
})
