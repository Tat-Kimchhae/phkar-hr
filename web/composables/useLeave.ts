import type { LeaveBalance, LeaveRequest, LeaveType } from '~/types'
import { useRestApi } from './useRestApi'

export function useLeave() {
  return {
    types: useRestApi<LeaveType>('leave-types'),
    balances: useRestApi<LeaveBalance>('leave-balances'),
    balanceSummaries: useRestApi<LeaveBalance & { remaining: number }>('leave-balance-summaries'),
    requests: useRestApi<LeaveRequest>('leave-requests'),
    approve: (id: string, comment?: string) => useRestApi<LeaveRequest>('leave-requests').action<LeaveRequest>(id, 'approve', comment ? { comment } : undefined),
    reject: (id: string, comment: string) => useRestApi<LeaveRequest>('leave-requests').action<LeaveRequest>(id, 'reject', { comment }),
    cancel: (id: string) => useRestApi<LeaveRequest>('leave-requests').action<LeaveRequest>(id, 'cancel'),
  }
}
