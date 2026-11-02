<script setup lang="ts">
defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
  }
}>()

const { t } = useI18n()
</script>

<template>
  <UApp>
    <main class="grid min-h-screen place-items-center bg-slate-50 px-6 text-center dark:bg-slate-900">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-emerald-600">{{ error.statusCode }}</p>
        <h1 class="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
          {{ error.statusMessage || error.message || t('errors.notFound') }}
        </h1>
        <NuxtLink
          to="/"
          class="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {{ t('navigation.dashboard') }}
        </NuxtLink>
      </div>
    </main>
  </UApp>
</template>
