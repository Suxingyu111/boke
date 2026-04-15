<script setup lang="ts">
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
</script>

<template>
  <footer class="mt-20 border-t border-line/80 bg-white/86 backdrop-blur">
    <div
      class="content-shell grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-end"
    >
      <div>
        <p class="font-display text-3xl">{{ siteStore.settings.title }}</p>
        <p class="mt-3 max-w-xl text-sm leading-6 text-ink/65">
          {{ siteStore.settings.description }}
        </p>
      </div>
      <div class="ui-surface-soft px-4 py-3 text-sm text-ink/60 md:text-right">
        <p>{{ siteStore.settings.copyright }}</p>
        <p class="mt-1">{{ siteStore.settings.icp }}</p>
      </div>
    </div>
  </footer>
</template>
