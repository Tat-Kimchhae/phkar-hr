<script setup lang="ts">
type AppSelectValue = string | number | null

interface AppSelectOption {
  label: string
  value: AppSelectValue
  code?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: AppSelectValue
  options: AppSelectOption[]
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  required?: boolean
  disabled?: boolean
  showCode?: boolean
  compactCode?: boolean
}>(), {
  modelValue: '',
  placeholder: '',
  searchable: false,
  clearable: false,
  required: false,
  disabled: false,
  showCode: false,
  compactCode: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: AppSelectValue]
  change: [value: AppSelectValue]
}>()

const selectedValue = computed<string | number>(() => props.modelValue ?? '')
const searchEnabled = computed(() => props.searchable || props.options.length > 8)
const selectedOption = computed(() => props.options.find(option => option.value === selectedValue.value))
const hasValue = computed(() => props.modelValue !== '' && props.modelValue !== null)

function updateValue(value: AppSelectValue) {
  emit('update:modelValue', value)
  emit('change', value)
}

function clearValue(event: MouseEvent) {
  event.stopPropagation()
  updateValue('')
}
</script>

<template>
  <div class="w-full" v-bind="$attrs">
    <USelectMenu
      :model-value="selectedValue"
      :options="options"
      option-attribute="label"
      value-attribute="value"
      :placeholder="placeholder"
      :searchable="searchEnabled"
      :required="required"
      :disabled="disabled"
      size="md"
      @update:model-value="updateValue"
    >
      <template #label>
        <span class="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <span v-if="showCode && selectedOption?.code" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ selectedOption.code }}</span>
          <span class="truncate" :class="{ 'max-[767px]:hidden': compactCode && showCode }">{{ selectedOption?.label || placeholder }}</span>
        </span>
      </template>
      <template #option="{ option }">
        <div class="flex min-w-0 items-center gap-2">
          <span v-if="showCode && option.code" class="min-w-8 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[11px] font-semibold tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ option.code }}</span>
          <span class="truncate">{{ option.label }}</span>
        </div>
      </template>
      <template #trailing>
        <button
          v-if="clearable && hasValue"
          type="button"
          class="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label="Clear selection"
          @mousedown.prevent.stop
          @click.stop="clearValue"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4" aria-hidden="true" />
        </button>
        <UIcon v-else name="i-heroicons-chevron-down-20-solid" class="h-5 w-5 text-slate-400" aria-hidden="true" />
      </template>
    </USelectMenu>
  </div>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>
