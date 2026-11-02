import { UIcon } from '#components'
import { toast } from 'vue-sonner'
import { defineComponent, h, markRaw } from 'vue'

export interface NotifyPromiseMessages<T> {
  loading: string
  success: string | ((value: T) => string)
  error: string | ((error: unknown) => string)
  id?: string
}

function stableId(kind: string, message: string): string {
  return `app:${kind}:${message}`
}

function createToastIcon(name: string) {
  return defineComponent({
    name: `Toast${name.replaceAll('-', '')}Icon`,
    setup: () => () => h(UIcon, { name: `i-heroicons-${name}`, class: 'size-5' }),
  })
}

const successIcon = markRaw(createToastIcon('check-circle'))
const errorIcon = markRaw(createToastIcon('x-circle'))
const warningIcon = markRaw(createToastIcon('exclamation-triangle'))
const infoIcon = markRaw(createToastIcon('information-circle'))

export function useNotify() {
  function show(message: string, description?: string, id?: string) {
    if (!import.meta.client) return
    return toast(message, { description, id: id ?? stableId('message', message) })
  }

  function success(message: string, description?: string, id?: string) {
    if (!import.meta.client) return
    return toast.success(message, { description, id: id ?? stableId('success', message), icon: successIcon })
  }

  function error(message: string, description?: string, id?: string) {
    if (!import.meta.client) return
    return toast.error(message, { description, id: id ?? stableId('error', message), icon: errorIcon })
  }

  function warning(message: string, description?: string, id?: string) {
    if (!import.meta.client) return
    return toast.warning(message, { description, id: id ?? stableId('warning', message), icon: warningIcon })
  }

  function info(message: string, description?: string, id?: string) {
    if (!import.meta.client) return
    return toast.info(message, { description, id: id ?? stableId('info', message), icon: infoIcon })
  }

  function loading(message: string, id?: string, duration?: number) {
    if (!import.meta.client) return
    return toast.loading(message, { id: id ?? stableId('loading', message), duration })
  }

  function promise<T>(task: Promise<T>, messages: NotifyPromiseMessages<T>) {
    if (!import.meta.client) return task
    toast.promise(task, {
      id: messages.id ?? stableId('promise', messages.loading),
      loading: messages.loading,
      success: (value: T) => ({
        message: typeof messages.success === 'function' ? messages.success(value) : messages.success,
        icon: successIcon,
      }),
      error: (error: unknown) => ({
        message: typeof messages.error === 'function' ? messages.error(error) : messages.error,
        icon: errorIcon,
      }),
    })
    return task
  }

  return { show, success, error, warning, info, loading, promise }
}
