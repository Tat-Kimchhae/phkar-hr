<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div class="grid min-h-64 place-items-center rounded-lg bg-slate-50 px-4 text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
    {{ message }}
  </div>
</template>
