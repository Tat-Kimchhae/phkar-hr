<script setup lang="ts">
import type { Employee } from '~/types'

const props = withDefaults(defineProps<{
  employee?: Pick<Employee, 'firstName' | 'lastName' | 'firstNameKh' | 'lastNameKh' | 'photoPath'> | null
  name?: string
  khmerName?: string
  photoPath?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>(), {
  employee: null,
  name: '',
  khmerName: '',
  photoPath: undefined,
  size: 'md',
})

const { locale } = useI18n()
const imageFailed = ref(false)
const romanName = computed(() => (props.name || [props.employee?.firstName, props.employee?.lastName].filter(Boolean).join(' ')).trim())
const localName = computed(() => (props.khmerName || [props.employee?.firstNameKh, props.employee?.lastNameKh].filter(Boolean).join(' ')).trim())
const displayName = computed(() => locale.value === 'km' && localName.value ? localName.value : romanName.value)
const photo = computed(() => props.photoPath !== undefined ? props.photoPath : props.employee?.photoPath ?? null)
const initials = computed(() => displayName.value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => Array.from(part)[0] ?? '').join('').toLocaleUpperCase())
const backgroundColor = computed(() => {
  let hash = 0
  for (const character of romanName.value) hash = (hash * 31 + character.codePointAt(0)!) | 0
  return [
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
    'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  ][Math.abs(hash) % 6]
})
const sizeClasses = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
}

watch(photo, () => {
  imageFailed.value = false
})
</script>

<template>
  <img
    v-if="photo && !imageFailed"
    :src="photo"
    :alt="displayName"
    :class="['shrink-0 rounded-full object-cover', sizeClasses[size]]"
    @error="imageFailed = true"
  >
  <span
    v-else
    role="img"
    :aria-label="displayName"
    :class="['inline-grid shrink-0 place-items-center rounded-full font-semibold', sizeClasses[size], backgroundColor]"
  >
    {{ initials }}
  </span>
</template>
