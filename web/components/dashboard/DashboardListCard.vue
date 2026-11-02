<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle: string
  viewAllLabel: string
  viewAllTo: string
  empty: string
  isEmpty: boolean
}>()
</script>

<template>
  <section class="dashboard-card flex min-h-[320px] min-w-0 flex-col p-6">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="truncate font-semibold text-slate-900 dark:text-white">{{ props.title }}</h2>
        <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ props.subtitle }}</p>
      </div>
      <NuxtLink :to="props.viewAllTo" class="shrink-0 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300">{{ props.viewAllLabel }}</NuxtLink>
    </header>
    <div v-if="props.isEmpty" class="grid flex-1 place-items-center py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      <p>{{ props.empty }}</p>
    </div>
    <div v-else class="mt-3 min-w-0 flex-1">
      <slot />
    </div>
  </section>
</template>
