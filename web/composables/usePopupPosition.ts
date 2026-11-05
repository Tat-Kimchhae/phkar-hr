import type { Ref } from 'vue'

interface PopupPositionOptions {
  align?: 'start' | 'end'
  matchWidth?: boolean
}

export function usePopupPosition(
  trigger: Ref<HTMLElement | null>,
  panel: Ref<HTMLElement | null>,
  open: Ref<boolean>,
  options: PopupPositionOptions = {},
) {
  const style = ref<Record<string, string>>({})

  function updatePosition() {
    const triggerElement = trigger.value
    const panelElement = panel.value
    if (!triggerElement || !panelElement) return

    const triggerRect = triggerElement.getBoundingClientRect()
    const panelRect = panelElement.getBoundingClientRect()
    const width = options.matchWidth ? triggerRect.width : panelRect.width
    const left = options.align === 'end' ? triggerRect.right - width : triggerRect.left
    const boundedLeft = Math.min(Math.max(8, left), window.innerWidth - width - 8)
    const gap = 4
    const below = window.innerHeight - triggerRect.bottom - gap - 8
    const above = triggerRect.top - gap - 8
    const flip = below < panelRect.height && above > below
    const availableHeight = Math.max(0, flip ? above : below)

    style.value = {
      position: 'fixed',
      top: `${flip ? Math.max(8, triggerRect.top - gap - Math.min(panelRect.height, availableHeight)) : triggerRect.bottom + gap}px`,
      left: `${boundedLeft}px`,
      width: `${width}px`,
      maxHeight: `${availableHeight}px`,
      zIndex: '9999',
    }
  }

  function handleViewportChange() {
    updatePosition()
  }

  watch(open, async (isOpen: boolean) => {
    if (!import.meta.client) return

    if (isOpen) {
      window.addEventListener('scroll', handleViewportChange, true)
      window.addEventListener('resize', handleViewportChange)
      await nextTick()
      updatePosition()
    } else {
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    window.removeEventListener('scroll', handleViewportChange, true)
    window.removeEventListener('resize', handleViewportChange)
  })

  return { style, updatePosition }
}
