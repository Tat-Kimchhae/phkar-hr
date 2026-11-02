<script setup lang="ts">
defineProps<{
  permission: string
}>()

const { can } = usePermission()
</script>

<template>
  <slot v-if="can(permission)" />
</template>
