import type { BaseRecord } from './common'

export type EmployeeGender = string
export type EmployeeStatus = string

export interface Employee extends BaseRecord {
  companyId: string
  branchId: string | null
  departmentId: string | null
  positionId: string | null
  managerId: string | null
  employeeNo: string
  firstName: string
  lastName: string
  firstNameKh: string | null
  lastNameKh: string | null
  gender: EmployeeGender
  dob: string | null
  phone: string | null
  email: string | null
  hireDate: string
  terminationDate: string | null
  terminationReason: string | null
  photoPath: string | null
  status: EmployeeStatus
}

export interface EmployeeDocument extends BaseRecord {
  employeeId: string
  type: string
  filePath: string
  expiryDate: string | null
}

export interface Contract extends BaseRecord {
  employeeId: string
  type: string
  startDate: string
  endDate: string | null
  status: string
}

export interface EmergencyContact extends BaseRecord {
  employeeId: string
  name: string
  relation: string
  phone: string
}

export interface EmployeeBankAccount extends BaseRecord {
  employeeId: string
  bankName: string
  accountName: string
  accountNoEncrypted: string
  isPrimary: boolean
}

export interface EmployeeDependent extends BaseRecord {
  employeeId: string
  name: string
  relation: string
  dob: string | null
}
