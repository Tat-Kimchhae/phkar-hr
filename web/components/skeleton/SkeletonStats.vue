<template>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <div v-for="item in 5" :key="item" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <USkeleton class="app-skeleton h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <USkeleton class="app-skeleton mt-4 h-8 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  </div>
</template>
