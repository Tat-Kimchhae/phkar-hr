<script setup lang="ts">
import AppSelect from '~/components/app/AppSelect.vue'
import NotificationListItem from '~/components/notifications/NotificationListItem.vue'
import type { Notification } from '~/types'

defineProps<{
  title: string
}>()

const { locale, setLocale, t } = useI18n()
const auth = useAuthStore()
const notify = useNotify()
const notificationsApi = useNotifications()
const colorMode = useColorMode()
const notificationPopover = ref<HTMLElement | null>(null)
const userMenuPopover = ref<HTMLElement | null>(null)
const notificationsOpen = ref(false)
const userMenuOpen = ref(false)
const notificationItems = ref<Notification[]>([])
const unreadCount = ref(0)
const notificationsLoading = ref(false)
const notificationsError = ref(false)
const markAllLoading = ref(false)
let notificationsRequestId = 0
const languageOptions = [
  { label: 'English', value: 'en', code: 'EN' },
  { label: 'ខ្មែរ', value: 'km', code: 'KM' },
]
const isDark = computed(() => colorMode.value === 'dark')

async function refreshNotifications() {
  const requestId = ++notificationsRequestId
  notificationsLoading.value = true
  notificationsError.value = false
  try {
    const result = await notificationsApi.list({ page: 1, pageSize: 8 })
    if (requestId !== notificationsRequestId) return
    notificationItems.value = result.items
    unreadCount.value = result.unread
  } catch {
    if (requestId === notificationsRequestId) notificationsError.value = true
  } finally {
    if (requestId === notificationsRequestId) notificationsLoading.value = false
  }
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) void refreshNotifications()
}

function handlePopoverPointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!notificationPopover.value?.contains(target)) notificationsOpen.value = false
  if (!userMenuPopover.value?.contains(target)) userMenuOpen.value = false
}

function handlePopoverKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  notificationsOpen.value = false
  userMenuOpen.value = false
}

async function markNotificationRead(notification: Notification) {
  notificationsOpen.value = false
  if (notification.readAt) return
  notificationItems.value = notificationItems.value.map((item: Notification) =>
    item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
  )
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  try {
    await notificationsApi.markRead(notification.id)
    await refreshNotifications()
  } catch {
    await refreshNotifications()
  }
}

async function markAllNotificationsRead() {
  if (!unreadCount.value || markAllLoading.value) return
  markAllLoading.value = true
  const readAt = new Date().toISOString()
  notificationItems.value = notificationItems.value.map((item: Notification) => ({ ...item, readAt: item.readAt ?? readAt }))
  unreadCount.value = 0
  try {
    await notificationsApi.markAllAsRead()
    await refreshNotifications()
  } catch {
    await refreshNotifications()
  } finally {
    markAllLoading.value = false
  }
}

async function toggleTheme(event: MouseEvent) {
  const nextPreference = isDark.value ? 'light' : 'dark'
  const root = document.documentElement
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)))
  const viewTransitionDocument = document as Document & {
    startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> }
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (viewTransitionDocument.startViewTransition && !reduceMotion) {
    root.style.setProperty('--theme-reveal-x', `${x}px`)
    root.style.setProperty('--theme-reveal-y', `${y}px`)
    root.style.setProperty('--theme-reveal-radius', `${radius}px`)
    root.classList.add('theme-view-transition')
    const transition = viewTransitionDocument.startViewTransition(async () => {
      colorMode.preference = nextPreference
      await nextTick()
    })
    void transition.finished.finally(() => {
      root.classList.remove('theme-view-transition')
      root.style.removeProperty('--theme-reveal-x')
      root.style.removeProperty('--theme-reveal-y')
      root.style.removeProperty('--theme-reveal-radius')
    })
    return
  }

  root.classList.add('theme-color-transition')
  colorMode.preference = nextPreference
  window.setTimeout(() => root.classList.remove('theme-color-transition'), 200)
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePopoverPointerDown)
  document.addEventListener('keydown', handlePopoverKeydown)
  void refreshNotifications()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePopoverPointerDown)
  document.removeEventListener('keydown', handlePopoverKeydown)
})

async function changeLanguage(code: string | number | boolean | null) {
  if (code === 'en' || code === 'km') await setLocale(code)
}

async function logout() {
  userMenuOpen.value = false
  await auth.logout().catch(() => undefined)
  notify.success(t('toast.logoutSuccess'), undefined, 'auth-logout-success')
  await navigateTo('/login')
}
</script>

<template>
  <header class="sticky top-0 z-10 flex h-20 min-w-0 items-center border-b border-slate-200 bg-white/90 px-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-8">
    <h1 class="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{{ title }}</h1>

    <div class="flex flex-none items-center gap-2">
      <div ref="notificationPopover" class="relative">
        <button
          type="button"
          class="relative grid size-10 cursor-pointer list-none place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          :aria-label="t('topbar.notifications')"
          :aria-expanded="notificationsOpen"
          aria-haspopup="true"
          :title="t('topbar.notifications')"
          @click="toggleNotifications"
        >
          <svg aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4.5-5.8V4a1.5 1.5 0 0 0-3 0v1.2A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9" />
          </svg>
          <span
            v-if="unreadCount > 0"
            class="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-5 text-white"
            aria-hidden="true"
          >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
        <Transition name="motion-scale">
        <div v-if="notificationsOpen" class="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p class="text-sm font-semibold">{{ t('topbar.notifications') }}</p>
            <button
              v-if="unreadCount > 0"
              type="button"
              class="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-300"
              :disabled="markAllLoading"
              @click="markAllNotificationsRead"
            >
              {{ t('topbar.markAllAsRead') }}
            </button>
          </div>
          <div class="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
            <div v-if="notificationsLoading" class="space-y-2 p-2" :aria-label="t('common.loading')">
              <div v-for="index in 4" :key="index" class="animate-pulse space-y-2 rounded-lg px-3 py-3">
                <div class="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div class="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <div v-else-if="notificationsError" class="px-3 py-5 text-center">
              <p class="text-sm text-slate-600 dark:text-slate-300">{{ t('notifications.loadError') }}</p>
              <button
                type="button"
                class="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                @click="refreshNotifications"
              >
                {{ t('common.retry') }}
              </button>
            </div>
            <p v-else-if="notificationItems.length === 0" class="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
              {{ t('topbar.noNotifications') }}
            </p>
            <div v-else class="space-y-1">
              <NotificationListItem
                v-for="notification in notificationItems"
                :key="notification.id"
                :notification="notification"
                @select="markNotificationRead"
              />
            </div>
          </div>
          <NuxtLink
            to="/notifications"
            class="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-slate-50 dark:border-slate-800 dark:text-emerald-300 dark:hover:bg-slate-800"
            @click="notificationsOpen = false"
          >
            {{ t('topbar.viewAll') }}
          </NuxtLink>
        </div>
        </Transition>
      </div>

      <div class="w-36 flex-none">
        <AppSelect
          :model-value="locale"
          :options="languageOptions"
          show-code
          compact-code
          class="w-full"
          :aria-label="t('topbar.switchLanguage')"
          :title="t('topbar.language')"
          @change="changeLanguage"
        />
      </div>

      <button
        type="button"
        class="theme-toggle grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        :aria-label="t('topbar.theme')"
        :title="isDark ? t('topbar.lightMode') : t('topbar.darkMode')"
        @click="toggleTheme"
      >
        <Transition name="theme-icon" mode="out-in">
          <svg v-if="isDark" key="sun" aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="4" />
            <path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
          <svg v-else key="moon" aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z" />
          </svg>
        </Transition>
      </button>

      <div ref="userMenuPopover" class="relative flex-none">
        <button
          type="button"
          class="flex h-12 min-w-10 flex-none cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-2 hover:bg-slate-100 dark:hover:bg-slate-800 md:min-w-[220px] md:justify-start"
          :aria-label="`${t('topbar.userMenu')}: ${auth.user?.name ?? ''}`"
          :aria-expanded="userMenuOpen"
          aria-haspopup="true"
          :title="auth.user?.name ?? undefined"
          @click="userMenuOpen = !userMenuOpen"
        >
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold uppercase text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{{ auth.user?.role.slice(0, 2) }}</span>
          <span class="hidden min-w-0 flex-1 items-baseline gap-2 whitespace-nowrap md:flex">
            <span class="max-w-[180px] truncate text-sm font-medium leading-[1.5]" :title="auth.user?.name ?? undefined">{{ auth.user?.name }}</span>
            <span class="shrink-0 text-xs leading-[1.5] text-slate-500 dark:text-slate-400">{{ t(`auth.roles.${auth.user?.role}`) }}</span>
          </span>
          <UIcon name="i-heroicons-chevron-down-20-solid" class="hidden size-4 shrink-0 text-slate-400 md:block" aria-hidden="true" />
        </button>
        <Transition name="motion-scale">
        <div v-if="userMenuOpen" class="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <NuxtLink to="/me" class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" @click="userMenuOpen = false">
            {{ t('topbar.profile') }}
          </NuxtLink>
          <button
            type="button"
            class="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="logout"
          >
            {{ t('auth.signOut') }}
          </button>
        </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
