<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import * as seoApi from "@/api/seo";
import { recordVisit } from "@/api/visitor-stats";
import { useCommunityStore } from "@/stores/community";
import { useI18nStore } from "@/stores/i18n";
import { useSiteStore } from "@/stores/site";
import { applySeo } from "@/utils/seo";

const siteStore = useSiteStore();
const i18nStore = useI18nStore();
const communityStore = useCommunityStore();
const route = useRoute();
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);
let trackedPath = "";
let trackedReferer = "";
let enteredAt = Date.now();
const scrollTop = ref(0);
const showBackToTop = computed(() => scrollTop.value > 520);

function getTrackedUrl() {
  if (/^https?:\/\//.test(apiBaseUrl)) {
    return `${apiBaseUrl}/stats/visit`;
  }

  return `${apiBaseUrl}/stats/visit`;
}

function startTracking(path: string, referer = "") {
  trackedPath = path;
  trackedReferer = referer;
  enteredAt = Date.now();
}

function getStayDuration() {
  return Math.max(0, Math.round((Date.now() - enteredAt) / 1000));
}

function createVisitPayload(path: string) {
  const stayDuration = getStayDuration();
  return {
    path,
    referer: trackedReferer || undefined,
    stayDuration,
  };
}

async function flushTrackedVisit() {
  if (!trackedPath) {
    return;
  }

  await recordVisit(createVisitPayload(trackedPath));
}

function flushTrackedVisitWithBeacon() {
  if (!trackedPath || typeof navigator === "undefined") {
    return;
  }

  const body = JSON.stringify(createVisitPayload(trackedPath));
  const blob = new Blob([body], { type: "application/json" });
  navigator.sendBeacon(getTrackedUrl(), blob);
}

function handlePageHide() {
  flushTrackedVisitWithBeacon();
}

function handleScroll() {
  scrollTop.value = window.scrollY || document.documentElement.scrollTop || 0;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function refreshSeo() {
  const settings = siteStore.settings;
  try {
    if (route.name === "article-detail") {
      const meta = await seoApi.getArticleSeoMeta(String(route.params.slug));
      applySeo(meta, settings);
      return;
    }

    if (route.name === "page-detail") {
      const meta = await seoApi.getPageSeoMeta(String(route.params.slug));
      applySeo(meta, settings);
      return;
    }
  } catch {
    // 单页应用先保证基础 meta 可用，接口失败时不阻断页面渲染。
  }

  const title = route.meta.title ? String(route.meta.title) : settings.title;
  applySeo(
    {
      title,
      description: settings.description,
      keywords: settings.keywords,
      ogImage: settings.ogImage,
      author: settings.author,
    },
    settings,
  );
}

onMounted(() => {
  void siteStore.loadPublicSettings();
  void i18nStore.load();
  void communityStore.loadPublicCommunity();
  startTracking(route.fullPath, document.referrer);
  handleScroll();
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("pagehide", handlePageHide);
  window.removeEventListener("scroll", handleScroll);
});

watch(
  () => [route.fullPath, siteStore.settings],
  () => {
    void refreshSeo();
  },
  { immediate: true },
);

watch(
  () => route.fullPath,
  async (nextPath, previousPath) => {
    if (!previousPath) {
      startTracking(nextPath, document.referrer);
      return;
    }

    try {
      await flushTrackedVisit();
    } catch {
      // 访客统计失败不影响页面导航。
    }

    startTracking(nextPath, `${window.location.origin}${previousPath}`);
  },
);
</script>

<template>
  <RouterView />
  <button
    v-if="showBackToTop"
    class="focus-ring app-backtop"
    type="button"
    @click="scrollToTop"
  >
    回到顶部
  </button>
</template>
