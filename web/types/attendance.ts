import type { BaseRecord } from './common'

export type AttendanceRecordStatus = string

export interface AttendanceLog extends BaseRecord {
  employeeId: string
  locationId: string | null
  workDate: string
  checkIn: string | null
  checkOut: string | null
  checkInLat: number | null
  checkInLng: number | null
  checkOutLat: number | null
  checkOutLng: number | null
  gpsAccuracyM: number | null
  isMockLocation: boolean
  deviceId: string | null
  method: string
  reason: string | null
  editedBy: string | null
  status: string
}

export interface AttendanceCorrection extends BaseRecord {
  employeeId: string
  attendanceLogId: string
  workDate: string
  requestedCheckIn: string | null
  requestedCheckOut: string | null
  reason: string
  status: string
  decidedBy: string | null
  decidedAt: string | null
}

export interface OvertimeRecord extends BaseRecord {
  employeeId: string
  workDate: string
  hours: number
  rateMultiplier: number
  status: string
  approvedBy: string | null
  payslipId: string | null
}

export interface PushToken extends BaseRecord {
  userId: string
  token: string
  platform: string
}
