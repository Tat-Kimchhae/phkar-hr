<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import '~/assets/css/toast.css'

const colorMode = useColorMode()
const toastTheme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
const toastPosition = ref<'top-right' | 'bottom-center'>('top-right')
let mobileQuery: MediaQueryList | undefined

function syncToastPosition() {
  toastPosition.value = mobileQuery?.matches ? 'bottom-center' : 'top-right'
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 767px)')
  syncToastPosition()
  mobileQuery.addEventListener('change', syncToastPosition)
})

onBeforeUnmount(() => mobileQuery?.removeEventListener('change', syncToastPosition))
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="rgb(var(--color-primary-500))" :height="2" :duration="200" :throttle="150" />
    <ClientOnly>
      <Toaster
        class="app-toaster"
        :position="toastPosition"
        :theme="toastTheme"
        :duration="3500"
        :visible-toasts="4"
        :close-button="true"
        :rich-colors="true"
        :expand="false"
      />
    </ClientOnly>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
