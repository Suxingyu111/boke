<script setup lang="ts">
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();

function sanitizeUrl(url: string) {
  const value = url.trim();
  if (!value) {
    return "#";
  }
  if (value.startsWith("/")) {
    return value;
  }
  try {
    const parsedUrl = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol)
      ? value
      : "#";
  } catch {
    return "#";
  }
}

function isExternalLink(url: string) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}
</script>

<template>
  <footer class="mt-20 border-t border-line/70 bg-surface/78 backdrop-blur-lg">
    <div
      class="content-shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)_minmax(240px,1fr)] lg:items-end"
    >
      <div>
        <p class="font-display text-4xl leading-none text-ink">
          {{ siteStore.settings.title }}
        </p>
        <p class="mt-3 max-w-xl text-sm leading-7 text-ink/68">
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
          class="focus-ring min-h-11 rounded-md border border-line bg-white/85 px-3 py-2 text-sm font-semibold text-ink/72 hover:border-brand/40 hover:text-brand"
          :href="sanitizeUrl(link.url)"
          :rel="
            isExternalLink(sanitizeUrl(link.url))
              ? 'noreferrer noopener'
              : undefined
          "
          :target="isExternalLink(sanitizeUrl(link.url)) ? '_blank' : undefined"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="ui-surface-soft px-4 py-3 text-sm text-ink/62 lg:text-right">
        <p>{{ siteStore.settings.copyright }}</p>
        <p class="mt-1">{{ siteStore.settings.icp }}</p>
      </div>
    </div>
  </footer>
</template>
