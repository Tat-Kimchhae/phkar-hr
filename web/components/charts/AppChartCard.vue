<script setup lang="ts">
import AppSelect from '~/components/app/AppSelect.vue'

const props = defineProps<{ title: string; range?: string; ranges?: Array<{ label: string; value: string }> }>()
const emit = defineEmits<{ 'update:range': [value: string] }>()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
    <header class="mb-4 flex min-h-9 items-center justify-between gap-3">
      <h2 class="font-semibold text-slate-900 dark:text-white">{{ props.title }}</h2>
      <AppSelect v-if="props.ranges && props.range" :model-value="props.range" :options="props.ranges" class="max-w-36" @change="emit('update:range', String($event))" />
    </header>
    <slot />
  </section>
</template>
