import type { BaseRecord } from './common'

export interface Company extends BaseRecord {
  name: string
  taxId: string | null
  defaultCurrency: string
}

export interface Branch extends BaseRecord {
  companyId: string
  name: string
  address: string | null
}

export interface Department extends BaseRecord {
  branchId: string | null
  parentId: string | null
  name: string
}

export interface Position extends BaseRecord {
  departmentId: string | null
  title: string
}

export interface Settings extends BaseRecord {
  companyId: string
  workWeek: string
  workStartTime: string
  graceMinutes: number
  defaultCurrency: string
}

export interface Holiday extends BaseRecord {
  companyId: string
  holidayDate: string
  name: string
}

export interface AttendanceLocation extends BaseRecord {
  branchId: string | null
  name: string
  latitude: number
  longitude: number
  radiusM: number
}
