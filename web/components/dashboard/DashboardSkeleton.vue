<script setup lang="ts">
defineProps<{ actionCount: number }>()
</script>

<template>
  <div class="space-y-6" aria-hidden="true">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="app-skeleton h-7 w-56 rounded bg-slate-200 dark:bg-slate-700" />
        <div class="app-skeleton mt-2 h-4 w-36 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div class="flex gap-2">
        <div v-for="item in actionCount" :key="item" class="app-skeleton h-9 w-28 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </header>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <div v-for="item in 5" :key="item" class="dashboard-card min-h-[178px] p-5">
        <div class="app-skeleton size-11 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div class="app-skeleton mt-4 h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="mt-2 flex items-end justify-between">
          <div class="app-skeleton h-8 w-16 rounded bg-slate-100 dark:bg-slate-800" />
          <div class="app-skeleton h-9 w-24 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
      <div class="dashboard-card min-h-[360px] p-6 md:col-span-1 xl:col-span-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="app-skeleton h-5 w-48 rounded bg-slate-100 dark:bg-slate-800" />
            <div class="app-skeleton mt-2 h-3 w-64 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div class="app-skeleton h-9 w-36 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div class="app-skeleton mt-5 h-5 w-48 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="app-skeleton mt-4 h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div class="dashboard-card min-h-[360px] p-6 md:col-span-1 xl:col-span-4">
        <div class="app-skeleton h-5 w-28 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="app-skeleton mt-6 h-20 w-40 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div class="mt-6 grid grid-cols-2 gap-4">
          <div v-for="item in 2" :key="item" class="space-y-3">
            <div class="app-skeleton h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
            <div v-for="row in 3" :key="row" class="app-skeleton h-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="card in 3" :key="card" class="dashboard-card min-h-[360px] p-6">
        <div class="app-skeleton h-5 w-40 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="app-skeleton mt-2 h-3 w-52 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="app-skeleton mt-6 h-60 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    </section>

    <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="card in 3" :key="card" class="dashboard-card min-h-[320px] p-6">
        <div class="app-skeleton h-5 w-40 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="app-skeleton mt-2 h-3 w-52 rounded bg-slate-100 dark:bg-slate-800" />
        <div class="mt-5 space-y-3">
          <div v-for="row in 5" :key="row" class="app-skeleton h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </section>
  </div>
</template>
