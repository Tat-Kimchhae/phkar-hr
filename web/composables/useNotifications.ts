import type { Notification } from '~/types'
import { useRestApi } from './useRestApi'

export interface NotificationListResult {
  items: Notification[]
  total: number
  unread: number
}

export interface NotificationListQuery {
  page?: number
  pageSize?: number
  limit?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  unread?: boolean
}

export function useNotifications() {
  const notifications = useRestApi<Notification>('notifications')
  return {
    ...notifications,
    list(query: NotificationListQuery = {}) {
      const params: Record<string, string | number> = {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? query.limit ?? 20,
      }
      if (query.sortBy) params.sort = query.sortBy
      if (query.sortDirection) params.sortDirection = query.sortDirection
      if (query.unread !== undefined) params.unread = String(query.unread)
      return notifications.fetch<NotificationListResult>(params)
    },
    markRead(id: string) {
      return notifications.update(id, { readAt: new Date().toISOString() })
    },
    markAllAsRead() {
      return notifications.post<{ updated: number; unread: number }>('read-all')
    },
  }
}
