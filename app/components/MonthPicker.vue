<!-- FE-22 MonthPicker (lld.md §3; S6, S10, S11, S13, S14): a labelled native month input with the theme's control
     styles. Stateless: the page owns the month (ST-7). An emptied input emits '' (the current month). -->
<script setup lang="ts">
defineProps<{ value: string }>()
const emit = defineEmits<{ change: [month: string] }>()
</script>

<template>
  <label class="month-picker">Month <input type="month" :value="value" @change="emit('change', ($event.target as HTMLInputElement).value)"></label>
</template>

<style scoped>
.month-picker { display: inline-flex; align-items: center; gap: 8px; }
.month-picker input { min-height: 24px; }
</style>
