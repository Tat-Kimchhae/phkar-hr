<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle: string
  figure?: string | number
  delta?: string
  range?: string
  ranges?: Array<{ label: string; value: string }>
}>()
const emit = defineEmits<{ 'update:range': [value: string] }>()
</script>

<template>
  <section class="dashboard-card flex h-full min-h-[360px] flex-col p-6">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold text-slate-900 dark:text-white">{{ props.title }}</h2>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ props.subtitle }}</p>
        <div v-if="props.figure !== undefined" class="mt-3 flex flex-wrap items-baseline gap-2">
          <strong class="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{{ props.figure }}</strong>
          <span v-if="props.delta" class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ props.delta }}</span>
        </div>
      </div>
      <div
        v-if="props.ranges && props.range"
        class="inline-flex shrink-0 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        :aria-label="props.title"
      >
        <button
          v-for="item in props.ranges"
          :key="item.value"
          type="button"
          class="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          :class="props.range === item.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : ''"
          :aria-pressed="props.range === item.value"
          @click="emit('update:range', item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </header>
    <div class="flex min-h-0 flex-1 flex-col">
      <slot />
    </div>
  </section>
</template>
