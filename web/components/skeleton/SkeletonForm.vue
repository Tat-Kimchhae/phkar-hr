<script setup lang="ts">
withDefaults(defineProps<{ fields?: number }>(), { fields: 6 })
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
    <div class="grid gap-5 sm:grid-cols-2">
      <div v-for="field in fields" :key="field" class="space-y-2">
        <USkeleton class="app-skeleton h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
        <USkeleton class="app-skeleton h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
    <div class="mt-6 flex justify-end gap-3">
      <USkeleton class="app-skeleton h-10 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
      <USkeleton class="app-skeleton h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  </div>
</template>
