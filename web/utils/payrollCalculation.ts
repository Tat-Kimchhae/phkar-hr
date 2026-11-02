export interface PayrollLine {
  itemType: 'earning' | 'deduction'
  label: string
  quantity: number | null
  rate: number | null
  amount: number
}

export interface PayrollCalculation {
  employee: { id: string; firstName: string; lastName: string; employeeNo: string }
  currency: string
  grossAmount: number
  totalDeductions: number
  netAmount: number
  lines: PayrollLine[]
}
