import type { BaseRecord } from './common'

export interface Notification extends BaseRecord {
  userId: string
  title: string
  body: string
  readAt: string | null
}
