<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { usePagesStore } from "@/stores/pages";
import type { CustomPage } from "@/types/blog";
import { renderMarkdown } from "@/utils/markdown";

const route = useRoute();
const pagesStore = usePagesStore();
const page = ref<CustomPage | undefined>();
const isMissing = ref(false);
const detailReady = ref(false);

const renderedContent = computed(() =>
  page.value
    ? page.value.contentHtml || renderMarkdown(page.value.content)
    : "",
);

const typeText = computed(() => {
  if (!page.value) {
    return "自定义页面";
  }

  const labels = {
    about: "关于我",
    custom: "自定义页面",
    resume: "在线简历",
    portfolio: "作品集",
  };

  return labels[page.value.pageType];
});

watch(
  () => route.params.slug,
  async (slug) => {
    isMissing.value = false;
    detailReady.value = false;
    const loadedPage = await pagesStore.loadPublicPage(String(slug));
    page.value =
      loadedPage ??
      pagesStore.publishedPages.find((item) => item.slug === String(slug));
    isMissing.value = !page.value;
    detailReady.value = true;
  },
  { immediate: true },
);

function formatDate(value?: string | null) {
  if (!value) {
    return "未发布";
  }

  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
</script>

<template>
  <section v-if="pagesStore.loading && !detailReady" class="content-shell py-20">
    <div class="ui-surface animate-pulse p-6 md:p-8">
      <div class="h-4 w-20 rounded-md bg-line"></div>
      <div class="mt-6 h-12 w-2/3 rounded-md bg-line"></div>
      <div class="mt-4 h-4 w-1/2 rounded-md bg-line"></div>
      <div class="mt-8 h-72 rounded-md bg-line"></div>
    </div>
  </section>

  <article v-if="page && !isMissing" class="bg-white/80">
    <header class="border-b border-line/80">
      <div class="content-shell py-10">
        <RouterLink
          class="focus-ring rounded-md text-sm font-medium text-coral hover:text-moss"
          to="/"
        >
          返回首页
        </RouterLink>
        <p class="eyebrow mt-8">{{ typeText }}</p>
        <h1
          class="mt-3 max-w-4xl font-display text-5xl leading-tight md:text-7xl"
        >
          {{ page.title }}
        </h1>
        <p v-if="page.summary" class="mt-5 max-w-2xl text-lg text-ink/70">
          {{ page.summary }}
        </p>
      </div>
    </header>

    <div
      class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,760px)_240px]"
    >
      <div
        class="markdown-body ui-surface bg-white p-5 md:p-8"
        v-html="renderedContent"
      ></div>

      <aside class="ui-surface-soft h-fit p-5">
        <p class="font-display text-2xl">页面信息</p>
        <dl class="mt-4 grid gap-3 text-sm text-ink/65">
          <div>
            <dt class="text-ink/45">类型</dt>
            <dd class="mt-1 text-ink">{{ typeText }}</dd>
          </div>
          <div>
            <dt class="text-ink/45">路径</dt>
            <dd class="mt-1 break-all text-ink">/pages/{{ page.slug }}</dd>
          </div>
          <div>
            <dt class="text-ink/45">发布时间</dt>
            <dd class="mt-1 text-ink">{{ formatDate(page.publishedAt) }}</dd>
          </div>
        </dl>
      </aside>
    </div>
  </article>

  <section v-else class="content-shell py-20">
    <p class="eyebrow">Page</p>
    <h1 class="mt-2 font-display text-5xl">页面暂不可用</h1>
    <p class="mt-4 max-w-xl text-ink/65">
      {{ pagesStore.errorMessage || "这个页面可能还没有发布，或者路径已经变更。" }}
    </p>
    <RouterLink
      class="focus-ring ui-button-primary mt-6 inline-flex px-5 py-3"
      to="/"
    >
      回到首页
    </RouterLink>
  </section>
</template>
