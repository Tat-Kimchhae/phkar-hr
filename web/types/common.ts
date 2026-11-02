export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface JoinRecord {
  createdAt: string
  updatedAt: string
}

export type RecordStatus = string
