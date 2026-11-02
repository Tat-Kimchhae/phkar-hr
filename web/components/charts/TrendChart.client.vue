<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { Chart as ChartJS, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)
defineProps<{ data: ChartData<'line', number[], string>; options: ChartOptions<'line'> }>()
</script>

<template><Line :data="data" :options="options" /></template>
