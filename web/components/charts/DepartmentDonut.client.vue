<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)
defineProps<{ data: ChartData<'doughnut', number[], string>; options: ChartOptions<'doughnut'>; total: number }>()
</script>

<template>
  <div class="relative h-64"><Doughnut :data="data" :options="options" /><span class="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong class="text-2xl text-slate-900 dark:text-white">{{ total }}</strong></span></div>
</template>
