export interface ListQuery {
  page: number
  pageSize: number
  search?: string
  sort?: string
  filters?: Record<string, string | number | boolean | null | undefined>
}

export interface ListResult<T> {
  items: T[]
  total: number
}
