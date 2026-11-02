<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)
defineProps<{ data: ChartData<'bar', number[], string>; options: ChartOptions<'bar'> }>()
</script>

<template><Bar :data="data" :options="options" /></template>
