import type { PayrollPeriod, PayrollRun } from '~/types'
import type { PayrollCalculation } from '~/utils/payrollCalculation'
import { usePayrollApi } from './usePayrollApi'

export function usePayroll() {
  const api = usePayrollApi()

  async function preview(period: PayrollPeriod): Promise<PayrollCalculation[]> {
    const result = await api.runs.post<{ items: PayrollCalculation[]; total: number }, { periodId: string }>(
      'preview',
      { periodId: period.id },
    )
    return result.items
  }

  function compute(period: PayrollPeriod): Promise<PayrollRun> {
    return api.runs.post<PayrollRun, { periodId: string }>('', { periodId: period.id })
  }

  return { ...api, preview, compute }
}
