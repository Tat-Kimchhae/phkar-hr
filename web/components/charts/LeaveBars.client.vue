<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)
const valueLabels: Plugin<'bar'> = {
  id: 'dashboardHorizontalBarValues',
  afterDatasetsDraw(chart) {
    if (chart.options.indexAxis !== 'y') return
    const context = chart.ctx
    context.save()
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--dashboard-muted').trim() || '#64748b'
    context.font = `500 11px ${getComputedStyle(document.body).fontFamily}`
    context.textBaseline = 'middle'
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex)
      meta.data.forEach((element, index) => {
        const value = dataset.data[index]
        if (typeof value !== 'number') return
        const locale = typeof chart.options.locale === 'string' ? chart.options.locale : undefined
        context.fillText(new Intl.NumberFormat(locale).format(value), element.x + 8, element.y)
      })
    })
    context.restore()
  },
}
ChartJS.register(valueLabels)
defineProps<{ data: ChartData<'bar', number[], string>; options: ChartOptions<'bar'> }>()
</script>

<template><Bar :data="data" :options="options" /></template>
