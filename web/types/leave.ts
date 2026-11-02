import type { BaseRecord } from './common'

export type LeaveRequestStatus = string

export interface LeaveType extends BaseRecord {
  name: string
  daysPerYear: number
  isPaid: boolean
  carryOver: boolean
  requiresAttachment: boolean
  maxDaysPerRequest: number
}

export interface LeaveBalance extends BaseRecord {
  employeeId: string
  leaveTypeId: string
  year: number
  entitled: number
  used: number
}

export interface LeaveRequest extends BaseRecord {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  days: number
  startHalf: string | null
  endHalf: string | null
  reason: string | null
  attachmentPath: string | null
  status: LeaveRequestStatus
  approvedBy: string | null
  approvedAt: string | null
  cancelledAt: string | null
}
