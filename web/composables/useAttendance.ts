import type {
  AttendanceCorrection,
  AttendanceLog,
  AttendanceLocation,
  OvertimeRecord,
} from '~/types'
import { useRestApi } from './useRestApi'

export type AttendanceDaySummary = {
  employee: import('~/types').Employee
  status: 'on_time' | 'late' | 'absent' | 'on_leave' | 'not_scheduled'
  checkIn: string | null
}

export type AttendanceMonthSummary = {
  employee: import('~/types').Employee
  onTime: number
  late: number
  absent: number
  onLeave: number
  workedHours: number
}

export function useAttendance() {
  return {
    locations: useRestApi<AttendanceLocation>('attendance-locations'),
    logs: useRestApi<AttendanceLog>('attendance-logs'),
    corrections: useRestApi<AttendanceCorrection>('attendance-corrections'),
    overtime: useRestApi<OvertimeRecord>('overtime-records'),
    summary: useRestApi<AttendanceDaySummary>('attendance-summary'),
    monthlySummary: useRestApi<AttendanceMonthSummary>('attendance-summary'),
    checkIn: (body: {
      employeeId: string
      locationId: string
      workDate: string
      checkIn: string
      checkInLat: number
      checkInLng: number
      gpsAccuracyM: number
      isMockLocation: boolean
      deviceId: string
      method: string
    }) => useRestApi<AttendanceLog>('attendance-logs').post<AttendanceLog>('check-in', body),
    approveCorrection: (id: string) => useRestApi<AttendanceCorrection>('attendance-corrections').action<AttendanceCorrection>(id, 'approve'),
    rejectCorrection: (id: string, reason: string) => useRestApi<AttendanceCorrection>('attendance-corrections').action<AttendanceCorrection>(id, 'reject', { reason }),
    approveOvertime: (id: string) => useRestApi<OvertimeRecord>('overtime-records').action<OvertimeRecord>(id, 'approve'),
    rejectOvertime: (id: string, reason: string) => useRestApi<OvertimeRecord>('overtime-records').action<OvertimeRecord>(id, 'reject', { reason }),
  }
}
