import { useRestApi } from './useRestApi'

export interface DashboardCharts {
  attendance: { labels: string[]; onTime: number[]; late: number[]; absent: number[]; onLeave: number[] }
  departmentHeadcount: { labels: string[]; values: number[]; total: number } | null
  leaveDaysByType: Array<{ label: string; value: number }>
  ownLeave: Array<{ label: string; used: number; remaining: number }>
  payroll: Array<{ label: string; gross: number; net: number }>
  hires: Array<{ label: string; value: number }>
}

export function useDashboardCharts() {
  const api = useRestApi<DashboardCharts>('dashboard/charts')
  return { load: (days: 7 | 14 | 30) => api.fetch<DashboardCharts>({ days }) }
}
