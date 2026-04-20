<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    compact?: boolean;
  }>(),
  {
    eyebrow: "",
    description: "",
    compact: false,
  },
);
</script>

<template>
  <section
    class="ui-surface rounded-md border border-dashed border-line text-center"
    :class="compact ? 'px-5 py-8' : 'px-6 py-12 md:px-8'"
  >
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <h2 class="font-display text-brand" :class="compact ? 'mt-2 text-3xl' : 'mt-2 text-5xl'">
      {{ title }}
    </h2>
    <p v-if="description" class="mx-auto mt-3 max-w-2xl text-ink/60">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-3">
      <slot />
    </div>
  </section>
</template>
