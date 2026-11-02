<script setup lang="ts">
export interface ChartLegendItem {
  label: string
  color: string
  visible?: boolean
}

const props = defineProps<{ items: ChartLegendItem[] }>()
const emit = defineEmits<{ toggle: [index: number] }>()
</script>

<template>
  <div v-if="props.items.length" class="mb-3 flex flex-wrap gap-x-4 gap-y-2">
    <button
      v-for="(item, index) in props.items"
      :key="`${item.label}-${index}`"
      type="button"
      class="inline-flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
      :class="{ 'opacity-40': item.visible === false }"
      :aria-pressed="item.visible !== false"
      @click="emit('toggle', index)"
    >
      <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />
      <span class="truncate">{{ item.label }}</span>
    </button>
  </div>
</template>
