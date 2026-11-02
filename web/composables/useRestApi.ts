import { $fetch } from 'ofetch'
import type { ListQuery, ListResult } from '~/types'

type ApiListOptions<T> = Partial<ListQuery> & {
  sort?: string
  sortDirection?: 'asc' | 'desc'
  filter?: Record<string, string | number | boolean | null | undefined>
  filters?: Record<string, string | number | boolean | null | undefined>
  offset?: number
  limit?: number
  sortBy?: string
}

function listQuery<T>(options: ApiListOptions<T> = {}) {
  const pageSize = options.pageSize ?? options.limit
  const page = options.page ?? (pageSize && options.offset !== undefined
    ? Math.floor(options.offset / pageSize) + 1
    : undefined)
  const query: Record<string, string | number> = {}

  if (page !== undefined) query.page = page
  if (pageSize !== undefined) query.pageSize = pageSize
  if (options.search?.trim()) query.search = options.search.trim()
  const sort = options.sort ?? options.sortBy
  if (sort) query.sort = String(sort)
  if (options.sortDirection) query.sortDirection = options.sortDirection

  for (const [key, value] of Object.entries({ ...options.filter, ...options.filters })) {
    if (value !== undefined && value !== null) query[key] = String(value)
  }
  return query
}

export function useRestApi<T>(path: string) {
  const config = useRuntimeConfig()
  const url = `${String(config.public.apiBase ?? '').replace(/\/$/, '')}/api/${path}`
  const auth = useAuthStore()
  const notify = useNotify()
  const { t } = useI18n()

  function getRequestPath(request: RequestInfo | URL): string {
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      return new URL(String(request), base).pathname
    } catch {
      return `/api/${path}`
    }
  }

  const request = $fetch.create({
    onRequest({ options }) {
      const headers = new Headers(options.headers)
      if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`)
      options.headers = headers
    },
    async onResponseError({ request: requestUrl, options, response }) {
      const method = String(options.method ?? 'GET').toUpperCase()
      const pathname = getRequestPath(requestUrl)
      const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)
      if (response.status === 401) {
        auth.clearSession()
        if (import.meta.client) {
          if (isMutation) notify.error(t('toast.sessionExpired'), undefined, `api-error:${method}:${pathname}`)
          if (useRoute().path !== '/login') await navigateTo('/login')
        }
        return
      }
      if (!import.meta.client || !isMutation) return

      const apiMessage = typeof response._data?.message === 'string' ? response._data.message : undefined
      const message = response.status === 422
        ? apiMessage ?? t('toast.validationFailed')
        : response.status === 403
          ? t('toast.permissionDenied')
          : response.status === 404
            ? t('toast.notFound')
            : response.status === 500
              ? t('toast.serverError')
              : apiMessage ?? t('toast.requestFailed')
      notify.error(message, undefined, `api-error:${method}:${pathname}`)
    },
  })

  return {
    list(options?: ApiListOptions<T>): Promise<ListResult<T>> {
      return request<ListResult<T>>(url, { query: listQuery(options) })
    },
    fetch<TResult>(query?: Record<string, string | number>): Promise<TResult> {
      return request<TResult>(url, { query })
    },
    async get(id: string): Promise<T | null> {
      const requestUrl: string = `${url}/${encodeURIComponent(id)}`
      try {
        return await request<T | null>(requestUrl)
      } catch (error) {
        if (
          typeof error === 'object'
          && error !== null
          && 'statusCode' in error
          && error.statusCode === 404
        ) return null
        throw error
      }
    },
    create(record: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<T> {
      const requestUrl: string = url
      return request<T>(requestUrl, { method: 'POST', body: record })
    },
    update(id: string, changes: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): Promise<T> {
      const requestUrl: string = `${url}/${encodeURIComponent(id)}`
      return request<T>(requestUrl, {
        method: 'PATCH',
        body: changes,
      })
    },
    remove(id: string): Promise<void> {
      return request<void>(`${url}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
    getById(id: string) {
      return this.get(id)
    },
    delete(id: string) {
      return this.remove(id)
    },
    removeByKey(...keys: string[]): Promise<void> {
      return request<void>(`${url}/${keys.map(key => encodeURIComponent(key)).join('/')}`, { method: 'DELETE' })
    },
    action<TResult, TBody extends Record<string, unknown> = Record<string, unknown>>(
      id: string,
      action: string,
      body?: TBody,
    ): Promise<TResult> {
      return request<TResult>(`${url}/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        body,
      })
    },
    uploadFile<TResult>(id: string, action: string, file: File): Promise<TResult> {
      const body = new FormData()
      body.append('photo', file)
      return request<TResult>(`${url}/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        body,
      })
    },
    deleteAction<TResult>(id: string, action: string): Promise<TResult> {
      return request<TResult>(`${url}/${encodeURIComponent(id)}/${action}`, { method: 'DELETE' })
    },
    post<TResult, TBody extends Record<string, unknown> = Record<string, unknown>>(
      action: string,
      body?: TBody,
    ): Promise<TResult> {
      return request<TResult>(`${url}/${action}`, {
        method: 'POST',
        body,
      })
    },
  }
}
