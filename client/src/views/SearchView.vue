<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import { useEcosystemStore } from "@/stores/ecosystem";

const ecosystemStore = useEcosystemStore();
const route = useRoute();
const router = useRouter();
const keyword = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const routeKeyword = computed(() =>
  typeof route.query.q === "string" ? route.query.q : "",
);
const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());
const results = computed(() => ecosystemStore.searchResults);

function renderHighlight(value?: string | null) {
  const escaped = (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return escaped
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

function syncKeywordFromRoute() {
  keyword.value = routeKeyword.value;
}

async function loadSearchResults(value = keyword.value) {
  await ecosystemStore.searchArticles({
    keyword: value.trim() || undefined,
    page: 1,
    pageSize: 12,
  });
}

watch(
  () => route.query.q,
  async () => {
    syncKeywordFromRoute();
    try {
      await loadSearchResults();
    } catch (error) {
      ecosystemStore.errorMessage = getApiErrorMessage(error, "搜索加载失败");
    }
  },
  { immediate: true },
);

watch(keyword, (value) => {
  if (value === routeKeyword.value) {
    return;
  }

  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(async () => {
    await router.replace({
      name: "search",
      query: value.trim() ? { q: value.trim() } : {},
    });
  }, 260);
});

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});
</script>

<template>
  <section class="content-shell py-10 md:py-14">
    <div>
      <p class="eyebrow">Search</p>
      <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">
        搜索文章
      </h1>
      <p class="mt-4 max-w-2xl leading-7 text-ink/66">
        输入关键词后，会按标题和正文检索；结果会同步到地址栏，方便分享。
      </p>
    </div>

    <form
      class="ui-surface-soft mt-8 grid max-w-2xl gap-3 p-4"
      role="search"
      @submit.prevent
    >
      <label class="text-sm font-semibold text-ink/62" for="search-keyword"
        >文章标题或正文</label
      >
      <input
        id="search-keyword"
        v-model="keyword"
        class="focus-ring w-full rounded-md border border-line bg-white px-4 py-3"
        placeholder="输入关键词"
        type="search"
      />
    </form>

    <div class="mt-5 flex flex-wrap items-center gap-3 text-sm text-ink/58">
      <span v-if="ecosystemStore.loading">正在搜索...</span>
      <span v-else>找到 {{ ecosystemStore.searchMeta.total }} 篇文章</span>
      <span v-if="normalizedKeyword">关键词：{{ keyword.trim() }}</span>
      <span v-if="ecosystemStore.errorMessage" class="text-coral">{{
        ecosystemStore.errorMessage
      }}</span>
    </div>

    <div v-if="results.length" class="mt-8 grid gap-5">
      <RouterLink
        v-for="article in results"
        :key="article.id"
        class="focus-ring ui-surface ui-hover-lift block p-5"
        :to="`/articles/${article.slug}`"
      >
        <div class="flex flex-wrap items-center gap-3 text-sm text-ink/55">
          <span>{{
            article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString("zh-CN")
              : "未设置发布时间"
          }}</span>
          <span v-if="typeof article.score === 'number'"
            >相关度 {{ article.score.toFixed(2) }}</span
          >
        </div>
        <h2
          class="mt-3 font-display text-3xl leading-tight text-brand"
          v-html="renderHighlight(article.title)"
        ></h2>
        <p
          class="mt-3 leading-7 text-ink/68"
          v-html="
            renderHighlight(article.contentHighlight || article.excerpt || '')
          "
        ></p>
      </RouterLink>
    </div>
    <div v-else-if="!ecosystemStore.loading" class="ui-surface mt-8 p-6">
      <h2 class="font-display text-3xl text-brand">没有匹配的文章</h2>
      <p class="mt-3 leading-7 text-ink/65">
        换一个标题或正文里的关键词再试试。
      </p>
    </div>
  </section>
</template>
