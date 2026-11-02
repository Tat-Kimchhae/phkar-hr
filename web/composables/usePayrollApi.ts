import type {
  Allowance,
  Deduction,
  EmployeeAllowance,
  EmployeeDeduction,
  EmployeeLoan,
  EmployeeSalary,
  ExchangeRate,
  PayrollAdjustment,
  PayrollPeriod,
  PayrollRun,
  Payslip,
  PayslipItem,
  SalaryStructure,
  SocialSecurityRule,
  TaxRule,
} from '~/types'
import { useRestApi } from './useRestApi'

export function usePayrollApi() {
  const runs = useRestApi<PayrollRun>('payroll/runs')
  return {
    salaryStructures: useRestApi<SalaryStructure>('salary-structures'),
    employeeSalaries: useRestApi<EmployeeSalary>('employee-salaries'),
    allowances: useRestApi<Allowance>('allowances'),
    employeeAllowances: useRestApi<EmployeeAllowance>('employee-allowances'),
    deductions: useRestApi<Deduction>('deductions'),
    employeeDeductions: useRestApi<EmployeeDeduction>('employee-deductions'),
    periods: useRestApi<PayrollPeriod>('payroll-periods'),
    runs,
    payslips: useRestApi<Payslip>('payslips'),
    payslipItems: useRestApi<PayslipItem>('payslip-items'),
    taxRules: useRestApi<TaxRule>('tax-rules'),
    socialSecurityRules: useRestApi<SocialSecurityRule>('social-security-rules'),
    employeeLoans: useRestApi<EmployeeLoan>('employee-loans'),
    adjustments: useRestApi<PayrollAdjustment>('payroll-adjustments'),
    exchangeRates: useRestApi<ExchangeRate>('exchange-rates'),
    approveRun: (id: string) => runs.action<PayrollRun>(id, 'approve'),
    lockRun: (id: string) => runs.action<PayrollRun>(id, 'lock'),
  }
}
