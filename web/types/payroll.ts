import type { BaseRecord } from './common'

export type PayrollStatus = string

export interface SalaryStructure extends BaseRecord {
  name: string
}

export interface EmployeeSalary extends BaseRecord {
  employeeId: string
  structureId: string
  baseSalary: number
  currency: string
  effectiveFrom: string
  effectiveTo: string | null
}

export interface Allowance extends BaseRecord {
  name: string
  calcType: string
  defaultAmount: number
  isTaxable: boolean
}

export interface EmployeeAllowance extends BaseRecord {
  employeeId: string
  allowanceId: string
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
}

export interface Deduction extends BaseRecord {
  name: string
  calcType: string
  rate: number
}

export interface EmployeeDeduction extends BaseRecord {
  employeeId: string
  deductionId: string
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
}

export interface PayrollPeriod extends BaseRecord {
  companyId: string
  startDate: string
  endDate: string
  status: string
}

export interface PayrollRun extends BaseRecord {
  periodId: string
  runBy: string | null
  runAt: string | null
  status: string
  approvedBy: string | null
  lockedAt: string | null
}

export interface Payslip extends BaseRecord {
  payrollRunId: string
  employeeId: string
  gross: number
  totalDeductions: number
  net: number
  currency: string
  workingDays: number
  absentDays: number
  otHours: number
  status: string
  paidAt: string | null
  pdfPath: string | null
}

export interface PayslipItem extends BaseRecord {
  payslipId: string
  type: string
  name: string
  amount: number
}

export interface TaxRule extends BaseRecord {
  name: string
  bracketMin: number
  bracketMax: number | null
  rate: number
  effectiveFrom: string
}

export interface SocialSecurityRule extends BaseRecord {
  name: string
  employeeRate: number
  employerRate: number
  salaryCap: number
  effectiveFrom: string
}

export interface EmployeeLoan extends BaseRecord {
  employeeId: string
  amount: number
  monthlyDeduction: number
  balance: number
  startDate: string
  status: string
}

export interface PayrollAdjustment extends BaseRecord {
  periodId: string
  employeeId: string
  type: string
  name: string
  amount: number
  reason: string | null
}

export interface ExchangeRate extends BaseRecord {
  currency: string
  rateToBase: number
  effectiveDate: string
}
