import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartDataset,
  type Plugin,
} from 'chart.js'

function themeToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function fontFamily(): string {
  return getComputedStyle(document.body).fontFamily || "Inter, 'Noto Sans Khmer', sans-serif"
}

function rgba(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1]
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map(part => part + part).join('') : hex
    const red = Number.parseInt(expanded.slice(0, 2), 16)
    const green = Number.parseInt(expanded.slice(2, 4), 16)
    const blue = Number.parseInt(expanded.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }
  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  return rgb ? `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})` : color
}

const tooltipElements = new WeakMap<Chart, HTMLDivElement>()

function createTooltip(chart: Chart): HTMLDivElement {
  let element = tooltipElements.get(chart)
  if (!element) {
    element = document.createElement('div')
    element.className = 'dashboard-chart-tooltip'
    element.style.opacity = '0'
    element.style.transform = 'translate3d(0, 4px, 0)'
    document.body.append(element)
    tooltipElements.set(chart, element)
  }
  return element
}

function renderTooltip({ chart, tooltip }: Parameters<NonNullable<typeof Chart.defaults.plugins.tooltip.external>>[0]) {
  const element = createTooltip(chart)
  if (!tooltip || tooltip.opacity === 0) {
    element.style.opacity = '0'
    element.style.transform = 'translate3d(0, 4px, 0)'
    return
  }

  element.replaceChildren()
  for (const title of tooltip.title) {
    const heading = document.createElement('div')
    heading.className = 'dashboard-chart-tooltip-title'
    heading.textContent = title
    element.append(heading)
  }
  for (const point of tooltip.dataPoints) {
    const row = document.createElement('div')
    row.className = 'dashboard-chart-tooltip-row'
    const dot = document.createElement('span')
    dot.className = 'dashboard-chart-tooltip-dot'
    const elementColor = point.element.options.backgroundColor
    const datasetColor = point.dataset.borderColor ?? point.dataset.backgroundColor
    const color = typeof elementColor === 'string' ? elementColor : datasetColor
    dot.style.backgroundColor = typeof color === 'string' ? color : '#64748b'
    const label = document.createElement('span')
    label.textContent = point.dataset.label || point.label || ''
    const value = document.createElement('span')
    value.className = 'dashboard-chart-tooltip-value'
    value.textContent = point.formattedValue
    row.append(dot, label, value)
    element.append(row)
  }

  const bounds = element.getBoundingClientRect()
  const left = Math.max(12, Math.min(window.innerWidth - bounds.width - 12, chart.canvas.getBoundingClientRect().left + tooltip.caretX + 12))
  const top = Math.max(12, Math.min(window.innerHeight - bounds.height - 12, chart.canvas.getBoundingClientRect().top + tooltip.caretY + 12))
  element.style.left = `${left}px`
  element.style.top = `${top}px`
  element.style.opacity = String(tooltip.opacity)
  element.style.transform = 'translate3d(0, 0, 0)'
}

const dashboardDefaults: Plugin = {
  id: 'dashboardChartDefaults',
  beforeDatasetsDraw(chart) {
    if (!chart.chartArea) return
    chart.data.datasets.forEach((dataset, index) => {
      if (chart.getDatasetMeta(index).type !== 'line') return
      const lineDataset = dataset as ChartDataset<'line'>
      const rawColor = lineDataset.borderColor
      const color = Array.isArray(rawColor) ? rawColor[0] : rawColor
      if (typeof color !== 'string') return
      const gradient = chart.ctx.createLinearGradient(0, chart.chartArea!.top, 0, chart.chartArea!.bottom)
      gradient.addColorStop(0, rgba(color, 0.22))
      gradient.addColorStop(1, rgba(color, 0))
      lineDataset.backgroundColor = gradient
      lineDataset.fill = true
    })
  },
  afterDatasetsDraw(chart) {
    if (chart.getDatasetMeta(0).type !== 'doughnut' || !chart.chartArea) return
    const values = chart.data.datasets[0]?.data ?? []
    const visibleTotal = values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0)
    const configuredTotal = Number(chart.canvas.dataset.centerTotal)
    const total = Number.isFinite(configuredTotal) ? configuredTotal : visibleTotal
    const { left, right, top, bottom } = chart.chartArea
    const centerX = (left + right) / 2
    const centerY = (top + bottom) / 2
    const context = chart.ctx
    context.save()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = themeToken('--dashboard-text', document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a')
    context.font = `600 24px ${fontFamily()}`
    const locale = chart.canvas.dataset.centerLocale || (typeof chart.options.locale === 'string' ? chart.options.locale : undefined)
    context.fillText(new Intl.NumberFormat(locale).format(total), centerX, centerY - 5)
    const label = chart.canvas.dataset.centerLabel
    if (label) {
      context.fillStyle = themeToken('--dashboard-muted', '#64748b')
      context.font = `500 11px ${fontFamily()}`
      context.fillText(label, centerX, centerY + 15)
    }
    context.restore()
  },
  afterDestroy(chart) {
    tooltipElements.get(chart)?.remove()
    tooltipElements.delete(chart)
  },
}

function applyDefaults() {
  const muted = () => themeToken('--dashboard-muted', '#64748b')
  const grid = () => themeToken('--dashboard-grid', 'rgba(100, 116, 139, .13)')
  const font = fontFamily()

  Chart.defaults.color = muted()
  Chart.defaults.font.family = font
  Chart.defaults.animation = {
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600,
    easing: 'easeOutQuart',
  }
  Chart.defaults.borderColor = 'transparent'
  Chart.defaults.plugins.legend.display = false
  Chart.defaults.plugins.tooltip.enabled = true
  Chart.defaults.plugins.tooltip.mode = 'index'
  Chart.defaults.plugins.tooltip.intersect = false
  Chart.defaults.plugins.tooltip.backgroundColor = 'transparent'
  Chart.defaults.plugins.tooltip.external = renderTooltip
  Chart.defaults.set('scale', {
    border: { display: false },
    grid: { drawTicks: false, color: grid, borderDash: [4, 4] },
    ticks: { color: muted, font: { family: font } },
  })
  Chart.defaults.elements.bar.borderRadius = 8
  Chart.defaults.elements.bar.borderSkipped = false
  Chart.defaults.datasets.bar.barPercentage = 0.55
  Chart.defaults.datasets.line.tension = 0.4
  Chart.defaults.datasets.line.borderWidth = 2.5
  Chart.defaults.datasets.line.pointRadius = 0
  Chart.defaults.datasets.line.pointHoverRadius = 4
  Chart.defaults.datasets.line.pointHoverBorderWidth = 2
  Chart.defaults.datasets.line.pointHoverBorderColor = '#ffffff'
}

export default defineNuxtPlugin(() => {
  Chart.register(
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
  )
  Chart.register(dashboardDefaults)
  applyDefaults()
  const observer = new MutationObserver(() => {
    applyDefaults()
    Object.values(Chart.instances).forEach(chart => chart.update('none'))
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.addEventListener('change', () => {
    applyDefaults()
    Object.values(Chart.instances).forEach(chart => chart.update('none'))
  })
})
