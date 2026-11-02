export function useChartTheme() {
  const palette = ref({
    primary: '#10b981', secondary: '#f59e0b', danger: '#ef4444', info: '#0ea5e9', violet: '#8b5cf6',
    text: '#475569', grid: '#e2e8f0', font: "Inter, 'Noto Sans Khmer', sans-serif", dark: false,
  })
  let observer: MutationObserver | undefined

  function update() {
    if (!import.meta.client) return
    const probe = document.createElement('span')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    document.body.append(probe)
    const color = (className: string, fallback: string) => {
      probe.className = className
      return getComputedStyle(probe).color || fallback
    }
    const dark = document.documentElement.classList.contains('dark')
    palette.value = {
      primary: color('text-primary-500', '#10b981'), secondary: color('text-amber-500', '#f59e0b'),
      danger: color('text-red-500', '#ef4444'), info: color('text-sky-500', '#0ea5e9'), violet: color('text-violet-500', '#8b5cf6'),
      text: color(dark ? 'text-slate-300' : 'text-slate-600', dark ? '#cbd5e1' : '#475569'),
      grid: color(dark ? 'text-slate-700' : 'text-slate-200', dark ? '#334155' : '#e2e8f0'),
      font: getComputedStyle(document.body).fontFamily, dark,
    }
    probe.remove()
  }

  onMounted(() => {
    update()
    observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  })
  onBeforeUnmount(() => observer?.disconnect())
  return palette
}
