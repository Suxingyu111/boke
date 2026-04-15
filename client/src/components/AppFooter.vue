<script setup lang="ts">
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
</script>

<template>
  <footer class="mt-16 border-t border-line bg-white">
    <div
      class="content-shell grid gap-6 py-10 md:grid-cols-[1fr_auto] md:items-end"
    >
      <div>
        <p class="font-display text-2xl">{{ siteStore.settings.title }}</p>
        <p class="mt-2 max-w-xl text-sm text-ink/65">
          {{ siteStore.settings.description }}
        </p>
      </div>
      <div class="text-sm text-ink/60 md:text-right">
        <p>{{ siteStore.settings.copyright }}</p>
        <p class="mt-1">{{ siteStore.settings.icp }}</p>
      </div>
    </div>
  </footer>
</template>
