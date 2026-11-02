export default defineAppConfig({
  ui: {
    primary: 'emerald',
    gray: 'slate',
    select: {
      rounded: 'rounded-lg',
      default: {
        size: 'md',
      },
    },
    selectMenu: {
      container: 'z-20 group w-full',
      width: 'w-full',
      height: 'max-h-60',
      base: 'relative focus:outline-none overflow-y-auto scroll-py-1',
      background: 'bg-white dark:bg-slate-900',
      shadow: 'shadow-md',
      rounded: 'rounded-lg',
      ring: 'ring-1 ring-slate-200 dark:ring-slate-700',
      padding: 'p-1',
      select: 'w-full min-h-10',
      option: {
        base: 'cursor-pointer select-none relative flex items-center justify-between gap-1',
        rounded: 'rounded-md',
        padding: 'px-3 py-2',
        active: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
        inactive: 'text-slate-700 dark:text-slate-200',
        selected: 'pe-8',
        selectedIcon: {
          base: 'h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0',
        },
      },
      transition: {
        enterActiveClass: 'transition ease-out duration-200',
        enterFromClass: 'translate-y-1 scale-95 opacity-0',
        enterToClass: 'translate-y-0 scale-100 opacity-100',
        leaveActiveClass: 'transition ease-in duration-150',
        leaveFromClass: 'translate-y-0 scale-100 opacity-100',
        leaveToClass: 'translate-y-1 scale-95 opacity-0',
      },
    },
    dropdown: {
      width: 'w-full',
      height: 'max-h-60',
      background: 'bg-white dark:bg-slate-900',
      shadow: 'shadow-md',
      rounded: 'rounded-lg',
      ring: 'ring-1 ring-slate-200 dark:ring-slate-700',
      base: 'relative focus:outline-none overflow-y-auto scroll-py-1',
      padding: 'p-1',
      item: {
        active: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
        inactive: 'text-slate-700 dark:text-slate-200',
      },
      transition: {
        enterActiveClass: 'transition ease-out duration-200',
        enterFromClass: 'translate-y-1 scale-95 opacity-0',
        enterToClass: 'translate-y-0 scale-100 opacity-100',
        leaveActiveClass: 'transition ease-in duration-150',
        leaveFromClass: 'translate-y-0 scale-100 opacity-100',
        leaveToClass: 'translate-y-1 scale-95 opacity-0',
      },
    },
    modal: {
      overlay: {
        transition: {
          enter: 'ease-out duration-200',
          leave: 'ease-in duration-150',
        },
      },
      transition: {
        enter: 'ease-out duration-200',
        leave: 'ease-in duration-150',
      },
    },
    slideover: {
      overlay: {
        transition: {
          enter: 'ease-out duration-200',
          leave: 'ease-in duration-150',
        },
      },
      transition: {
        enter: 'transform transition ease-in-out duration-200',
        leave: 'transform transition ease-in-out duration-150',
      },
    },
    notification: {
      transition: {
        enterActiveClass: 'transform ease-out duration-200 transition',
        enterFromClass: 'translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2',
        enterToClass: 'translate-y-0 opacity-100 sm:translate-x-0',
        leaveActiveClass: 'transition ease-in duration-100',
        leaveFromClass: 'opacity-100',
        leaveToClass: 'opacity-0',
      },
    },
  },
})
