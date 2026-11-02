<script setup lang="ts">
import AppSidebar from '~/components/AppSidebar.vue'
import AppTopbar from '~/components/AppTopbar.vue'

const route = useRoute()
const { t } = useI18n()
const sidebarCollapsed = ref(false)

const pageTitle = computed(() => {
  const routeName = String(route.name ?? 'dashboard').replace(/___(en|km)$/, '')
  const matchedRouteName = routeName.split('-')[0]
  const pageKey = route.path.startsWith('/organization/')
    ? 'organization'
    : route.path.startsWith('/employees/')
      ? 'employees'
      : route.path === '/notifications'
        ? 'notifications'
      : matchedRouteName in {
    dashboard: true,
    organization: true,
    employees: true,
    access: true,
    leave: true,
    attendance: true,
    payroll: true,
    reports: true,
    me: true,
    notifications: true,
  }
    ? matchedRouteName
    : 'dashboard'

  return t(`pages.${pageKey}`)
})
</script>

<template>
  <div class="min-h-screen min-w-0 max-w-full overflow-x-clip bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    <div class="min-h-screen min-w-0 max-w-full transition-[padding] duration-200 md:pl-64" :class="{ 'md:!pl-20': sidebarCollapsed }">
      <AppTopbar :title="pageTitle" />
      <main class="min-w-0 max-w-full p-5 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
