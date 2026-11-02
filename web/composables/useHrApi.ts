import { useAccess } from './useAccess'
import { useAttendance } from './useAttendance'
import { useEmployees } from './useEmployees'
import { useLeave } from './useLeave'
import { useNotifications } from './useNotifications'
import { useOrganization } from './useOrganization'
import { usePayrollApi } from './usePayrollApi'

export function useHrApi() {
  return {
    organization: useOrganization(),
    employees: useEmployees(),
    access: useAccess(),
    leave: useLeave(),
    attendance: useAttendance(),
    payroll: usePayrollApi(),
    notifications: { notifications: useNotifications() },
  }
}
