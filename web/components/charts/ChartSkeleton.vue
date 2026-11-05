<template>
  <div class="flex flex-1 flex-col" aria-hidden="true">
    <div class="mb-4 flex flex-wrap gap-3">
      <div v-for="item in 3" :key="item" class="app-skeleton h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
    </div>
    <div class="app-skeleton min-h-56 flex-1 rounded-xl bg-slate-100 dark:bg-slate-800" />
  </div>
</template>
