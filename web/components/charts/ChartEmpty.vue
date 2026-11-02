<script setup lang="ts">
defineProps<{ message: string; retryLabel?: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="grid min-h-56 flex-1 place-items-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
    <div>
      <span class="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.7">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 19V5m0 14h16M8 15v-3m4 3V8m4 7v-5" />
        </svg>
      </span>
      {{ message }}
      <button v-if="retryLabel" type="button" class="mt-3 block text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300" @click="emit('retry')">
        {{ retryLabel }}
      </button>
    </div>
  </div>
</template>
