<script setup lang="ts">
import NotificationListItem from '~/components/notifications/NotificationListItem.vue'
import type { Notification } from '~/types'

const { t } = useI18n()
const notificationsApi = useNotifications()
const notifications = ref<Notification[]>([])
const filter = ref<'all' | 'unread'>('all')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const unreadCount = ref(0)
const loading = ref(true)
const loadError = ref(false)
let requestId = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function loadNotifications() {
  const currentRequestId = ++requestId
  loading.value = true
  loadError.value = false
  try {
    const result = await notificationsApi.list({
      page: page.value,
      pageSize,
      ...(filter.value === 'unread' ? { unread: true } : {}),
    })
    if (currentRequestId !== requestId) return
    notifications.value = result.items
    total.value = result.total
    unreadCount.value = result.unread
  } catch {
    if (currentRequestId === requestId) loadError.value = true
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

async function markNotificationRead(notification: Notification) {
  if (notification.readAt) return
  notifications.value = notifications.value.map((item: Notification) =>
    item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
  )
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  try {
    await notificationsApi.markRead(notification.id)
    await loadNotifications()
  } catch {
    await loadNotifications()
  }
}

watch(filter, () => {
  page.value = 1
})
watch([page, filter], () => void loadNotifications(), { immediate: true })
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold tracking-tight">{{ t('notifications.title') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('notifications.unreadCount', { count: unreadCount }) }}</p>
      </div>
      <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        <button
          v-for="option in ['all', 'unread'] as const"
          :key="option"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filter === option
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          :aria-pressed="filter === option"
          @click="filter = option"
        >
          {{ t(`notifications.filters.${option}`) }}
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <div v-if="loading" class="space-y-2 p-2" :aria-label="t('common.loading')">
        <div v-for="index in 6" :key="index" class="animate-pulse space-y-2 rounded-lg px-3 py-3">
          <div class="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div class="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      <div v-else-if="loadError" class="px-4 py-12 text-center">
        <p class="text-sm text-slate-600 dark:text-slate-300">{{ t('notifications.loadError') }}</p>
        <button
          type="button"
          class="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
          @click="loadNotifications"
        >
          {{ t('common.retry') }}
        </button>
      </div>
      <p v-else-if="notifications.length === 0" class="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        {{ t(filter === 'unread' ? 'notifications.emptyUnread' : 'notifications.empty') }}
      </p>
      <div v-else class="space-y-1">
        <NotificationListItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @select="markNotificationRead"
        />
      </div>
    </div>

    <div class="flex items-center justify-between gap-4">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('notifications.records', { count: total }) }}</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
          :disabled="page <= 1 || loading"
          @click="page -= 1"
        >
          {{ t('common.previous') }}
        </button>
        <span class="text-sm text-slate-600 dark:text-slate-300">{{ page }} / {{ pageCount }}</span>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
          :disabled="page >= pageCount || loading"
          @click="page += 1"
        >
          {{ t('common.next') }}
        </button>
      </div>
    </div>
  </section>
</template>
