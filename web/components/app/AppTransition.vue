<script setup lang="ts">
withDefaults(defineProps<{
  name?: 'motion-fade' | 'motion-scale' | 'motion-stagger' | 'motion-dialog'
  mode?: 'default' | 'in-out' | 'out-in'
  appear?: boolean
}>(), {
  name: 'motion-fade',
  mode: 'out-in',
  appear: false,
})
</script>

<template>
  <Transition :name="name" :mode="mode" :appear="appear">
    <slot />
  </Transition>
</template>
