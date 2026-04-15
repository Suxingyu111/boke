<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
}>();
</script>

<template>
  <div class="ui-surface-soft ui-hover-lift px-5 py-4">
    <p class="text-sm font-medium text-ink/55">{{ label }}</p>
    <p class="mt-2 font-display text-4xl leading-none">{{ value }}</p>
  </div>
</template>
