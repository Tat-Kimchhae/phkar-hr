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
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const rootElement = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const filteredOptions = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  return search
    ? props.options.filter(option => option.label.toLocaleLowerCase().includes(search))
    : props.options
})
const { style: popupStyle } = usePopupPosition(trigger, panel, isOpen, { matchWidth: true })

watch(query, () => {
  activeIndex.value = 0
})

function updateValue(value: AppSelectValue) {
  if (value !== selectedValue.value) {
    emit('update:modelValue', value)
    emit('change', value)
  }
  isOpen.value = false
  query.value = ''
}

function clearValue(event: MouseEvent) {
  event.stopPropagation()
  updateValue('')
}

function openMenu() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    activeIndex.value = Math.max(0, filteredOptions.value.findIndex((option: AppSelectOption) => option.value === selectedValue.value))
    if (searchEnabled.value) nextTick(() => searchInput.value?.focus())
  } else {
    query.value = ''
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
    query.value = ''
    return
  }

  if (!isOpen.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openMenu()
    }
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    for (let attempt = 0; attempt < filteredOptions.value.length; attempt++) {
      activeIndex.value = (activeIndex.value + direction + filteredOptions.value.length) % filteredOptions.value.length
      if (!filteredOptions.value[activeIndex.value]?.disabled) break
    }
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const option = filteredOptions.value[activeIndex.value]
    if (option && !option.disabled) updateValue(option.value)
  }
}

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (rootElement.value?.contains(target) || panel.value?.contains(target)) return
  isOpen.value = false
  query.value = ''
}

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointerDown))
</script>

<template>
  <div ref="rootElement" class="relative w-full" v-bind="$attrs">
    <input v-if="required" :value="selectedValue" required :disabled="disabled" tabindex="-1" aria-hidden="true" class="absolute inset-0 w-px cursor-default opacity-0">
    <button
      ref="trigger"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :disabled="disabled"
      class="relative block w-full min-h-10 border-0 rounded-lg text-sm gap-x-2 px-3 py-2 shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-75 flex items-center justify-between"
      :class="{ 'pr-8': clearable && hasValue }"
      @click="openMenu"
      @keydown="handleKeydown"
    >
      <span class="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <span v-if="showCode && selectedOption?.code" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ selectedOption.code }}</span>
        <span class="truncate" :class="{ 'max-[767px]:hidden': compactCode && showCode, 'text-gray-400 dark:text-gray-500': !selectedOption }">{{ selectedOption?.label || placeholder || '\u00a0' }}</span>
      </span>
      <span class="flex shrink-0 items-center">
        <UIcon v-if="!clearable || !hasValue" name="i-heroicons-chevron-down-20-solid" class="h-5 w-5 text-slate-400" aria-hidden="true" />
      </span>
    </button>
    <button
      v-if="clearable && hasValue"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
      aria-label="Clear selection"
      @mousedown.prevent.stop
      @click.stop="clearValue"
    >
      <UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panel"
        :style="popupStyle"
        class="fixed z-[9999] w-full rounded-lg bg-white shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        @keydown="handleKeydown"
      >
        <div class="max-h-60 overflow-y-auto scroll-py-1 p-1" role="listbox">
          <input
            v-if="searchEnabled"
            ref="searchInput"
            v-model="query"
            type="text"
            autocomplete="off"
            placeholder="Search..."
            class="sticky -top-1 -mx-1 -mt-1 mb-1 block w-[calc(100%+0.5rem)] border-0 border-b border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-transparent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
            @keydown="handleKeydown"
          >
          <button
            v-for="(option, index) in filteredOptions"
            :key="`${typeof option.value}:${option.value}`"
            type="button"
            role="option"
            :aria-selected="option.value === selectedValue"
            :disabled="option.disabled"
            class="relative flex w-full cursor-pointer select-none items-center justify-between gap-1 rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
            :class="[
              index === activeIndex ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-200',
              option.value === selectedValue ? 'pe-8' : '',
            ]"
            @mouseenter="activeIndex = index"
            @click="updateValue(option.value)"
          >
            <span class="flex min-w-0 items-center gap-2">
              <span v-if="showCode && option.code" class="min-w-8 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[11px] font-semibold tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ option.code }}</span>
              <span class="truncate">{{ option.label }}</span>
            </span>
            <UIcon v-if="option.value === selectedValue" name="i-heroicons-check-20-solid" class="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </button>
          <p v-if="filteredOptions.length === 0" class="px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500">{{ query ? `No results for "${query}".` : 'No options.' }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>
