<script setup lang="ts">
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

definePageMeta({ middleware: [] })

const { t } = useI18n()
const colorMode = useColorMode()
const notify = useNotify()

function testPromise() {
  return notify.promise(new Promise<void>(resolve => window.setTimeout(resolve, 900)), {
    loading: t('toast.testPromiseLoading'),
    success: t('toast.testPromiseSuccess'),
    error: t('toast.testPromiseError'),
    id: 'toast-test-promise',
  })
}
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-6 p-5 md:p-8">
    <header>
      <h1 class="text-2xl font-semibold">{{ t('toast.testTitle') }}</h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ t('toast.testDescription') }}</p>
    </header>

    <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <p class="mb-4 text-sm text-slate-500">{{ colorMode.value === 'dark' ? t('toast.themeDark') : t('toast.themeLight') }}</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <button type="button" data-toast-type="default" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" @click="notify.show(t('toast.testDefault'), t('toast.khmerSample'), 'toast-test-default')">{{ t('toast.testDefault') }}</button>
        <button type="button" data-toast-type="success" class="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-left text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-100" @click="notify.success(t('toast.testSuccess'), t('toast.khmerSample'), 'toast-test-success')">{{ t('toast.testSuccess') }}</button>
        <button type="button" data-toast-type="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100" @click="notify.error(t('toast.testError'), t('toast.khmerSample'), 'toast-test-error')">{{ t('toast.testError') }}</button>
        <button type="button" data-toast-type="warning" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" @click="notify.warning(t('toast.testWarning'), t('toast.khmerSample'), 'toast-test-warning')">{{ t('toast.testWarning') }}</button>
        <button type="button" data-toast-type="info" class="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100" @click="notify.info(t('toast.testInfo'), t('toast.khmerSample'), 'toast-test-info')">{{ t('toast.testInfo') }}</button>
        <button type="button" data-toast-type="loading" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" @click="notify.loading(t('toast.testLoading'), 'toast-test-loading', 2500)">{{ t('toast.testLoading') }}</button>
        <button type="button" data-toast-type="promise" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" @click="testPromise">{{ t('toast.testPromise') }}</button>
      </div>
    </section>
  </main>
</template>
