<script setup lang="ts">
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();

function isExternalLink(url: string) {
  return /^(https?:)?\/\//i.test(url);
}
</script>

<template>
  <footer class="mt-20 border-t border-line/80 bg-white/86 backdrop-blur">
    <div
      class="content-shell grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(220px,auto)_minmax(220px,auto)] lg:items-end"
    >
      <div>
        <p class="font-display text-3xl">{{ siteStore.settings.title }}</p>
        <p class="mt-3 max-w-xl text-sm leading-6 text-ink/65">
          {{ siteStore.settings.description }}
        </p>
      </div>
      <nav
        v-if="siteStore.settings.socialLinks.length"
        class="flex flex-wrap gap-2 lg:justify-end"
        aria-label="社交链接"
      >
        <a
          v-for="link in siteStore.settings.socialLinks"
          :key="`${link.label}-${link.url}`"
          class="focus-ring min-h-11 rounded-md border border-line bg-paper px-3 py-2 text-sm font-medium text-ink/68 hover:border-moss hover:bg-white hover:text-moss"
          :href="link.url"
          :rel="isExternalLink(link.url) ? 'noreferrer' : undefined"
          :target="isExternalLink(link.url) ? '_blank' : undefined"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="ui-surface-soft px-4 py-3 text-sm text-ink/60 lg:text-right">
        <p>{{ siteStore.settings.copyright }}</p>
        <p class="mt-1">{{ siteStore.settings.icp }}</p>
      </div>
    </div>
  </footer>
</template>
