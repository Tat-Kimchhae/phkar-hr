<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; columns?: number; framed?: boolean }>(), { rows: 5, columns: 5, framed: false })
</script>

<template>
  <div class="overflow-hidden" :class="framed ? 'rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : ''">
    <div class="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/60" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
      <USkeleton v-for="column in columns" :key="`header-${column}`" class="app-skeleton h-3 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
    <div v-for="row in rows" :key="row" class="grid min-h-12 items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-0 dark:border-slate-800" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
      <USkeleton v-for="column in columns" :key="`${row}-${column}`" class="app-skeleton h-3 rounded bg-slate-100 dark:bg-slate-800" :class="column === 1 ? 'w-4/5' : 'w-3/5'" />
    </div>
  </div>
</template>
