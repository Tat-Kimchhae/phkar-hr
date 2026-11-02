<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/km'
import type { Notification } from '~/types'

dayjs.extend(relativeTime)

const props = defineProps<{
  notification: Notification
}>()
const emit = defineEmits<{
  select: [notification: Notification]
}>()
const { locale } = useI18n()
const relativeTimeText = computed(() => dayjs(props.notification.createdAt)
  .locale(locale.value === 'km' ? 'km' : 'en')
  .fromNow())
</script>

<template>
  <button
    type="button"
    class="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors"
    :class="notification.readAt
      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      : 'bg-slate-50/90 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800'"
    :aria-label="`${notification.title}. ${notification.body}`"
    @click="emit('select', notification)"
  >
    <span
      class="mt-1.5 size-2 flex-none rounded-full"
      :class="notification.readAt ? 'bg-transparent' : 'bg-emerald-500'"
      :aria-hidden="true"
    />
    <span class="min-w-0 flex-1">
      <span class="flex items-start justify-between gap-3">
        <span class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ notification.title }}</span>
        <time :datetime="notification.createdAt" class="shrink-0 text-xs text-slate-500 dark:text-slate-400">{{ relativeTimeText }}</time>
      </span>
      <span class="mt-1 block truncate text-sm text-slate-600 dark:text-slate-300">{{ notification.body }}</span>
    </span>
  </button>
</template>
