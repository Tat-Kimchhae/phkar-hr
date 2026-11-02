<script setup lang="ts">
withDefaults(defineProps<{ tabs?: number; fields?: number }>(), { tabs: 5, fields: 8 })
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <div class="flex items-center gap-4">
        <USkeleton class="app-skeleton size-16 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div class="min-w-0 flex-1 space-y-3">
          <USkeleton class="app-skeleton h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <USkeleton class="app-skeleton h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
    <div v-if="tabs" class="flex gap-3 overflow-hidden border-b border-slate-200 pb-3 dark:border-slate-700">
      <USkeleton v-for="tab in tabs" :key="tab" class="app-skeleton h-8 w-20 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800" />
    </div>
    <div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <div class="grid gap-5 sm:grid-cols-2">
        <div v-for="field in fields" :key="field" class="space-y-2">
          <USkeleton class="app-skeleton h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
          <USkeleton class="app-skeleton h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  </div>
</template>
