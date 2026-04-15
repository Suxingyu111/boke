<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
}>();
</script>

<template>
  <div class="border border-line bg-white px-4 py-3">
    <p class="text-sm text-ink/55">{{ label }}</p>
    <p class="mt-1 font-display text-3xl">{{ value }}</p>
  </div>
</template>
