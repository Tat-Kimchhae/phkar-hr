<script setup lang="ts">
withDefaults(defineProps<{ filters?: number }>(), { filters: 4 })
</script>

<template>
  <div class="grid gap-3 border-b border-slate-200 p-5 dark:border-slate-700 sm:grid-cols-2 xl:grid-cols-4">
    <USkeleton v-for="filter in filters" :key="filter" class="app-skeleton h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
  </div>
</template>
