<script setup lang="ts">
const { t } = useI18n()

const links = [
  { key: 'companySettings', to: '/organization' },
  { key: 'branches', to: '/organization/branches' },
  { key: 'departments', to: '/organization/departments' },
  { key: 'positions', to: '/organization/positions' },
  { key: 'attendanceLocations', to: '/organization/locations' },
]
</script>

<template>
  <nav class="mb-6 flex flex-wrap gap-2" :aria-label="t('organization.sections')">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      active-class="!border-emerald-600 !bg-emerald-50 !text-emerald-700 dark:!bg-emerald-950 dark:!text-emerald-300"
      :exact="link.to === '/organization'"
    >
      {{ t(`organization.${link.key}`) }}
    </NuxtLink>
  </nav>
</template>
