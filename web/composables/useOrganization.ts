import type {
  AttendanceLocation,
  Branch,
  Company,
  Department,
  Holiday,
  Position,
  Settings,
} from '~/types'
import { useRestApi } from './useRestApi'

export function useOrganization() {
  return {
    companies: useRestApi<Company>('companies'),
    branches: useRestApi<Branch>('branches'),
    departments: useRestApi<Department>('departments'),
    positions: useRestApi<Position>('positions'),
    settings: useRestApi<Settings>('settings'),
    holidays: useRestApi<Holiday>('holidays'),
    attendanceLocations: useRestApi<AttendanceLocation>('attendance-locations'),
  }
}
