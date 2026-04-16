<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { useContentStore } from "@/stores/content";

const contentStore = useContentStore();
const route = useRoute();
const router = useRouter();
const keyword = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const routeKeyword = computed(() =>
  typeof route.query.q === "string" ? route.query.q : "",
);
const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());
const results = computed(() => contentStore.publishedArticles);

function syncKeywordFromRoute() {
  keyword.value = routeKeyword.value;
}

function loadSearchResults(value = keyword.value) {
  return contentStore
    .loadPublicContent({
      keyword: value.trim() || undefined,
    })
    .catch(() => undefined);
}

onMounted(() => {
  syncKeywordFromRoute();
  void loadSearchResults();
});

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});

watch(
  () => route.query.q,
  () => {
    syncKeywordFromRoute();
    void loadSearchResults();
  },
);

watch(keyword, (value) => {
  if (value === routeKeyword.value) {
    return;
  }

  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    void router.replace({
      name: "search",
      query: value.trim() ? { q: value.trim() } : {},
    });
  }, 260);
});
</script>

<template>
  <section class="content-shell py-12">
    <p class="eyebrow">Search</p>
    <h1 class="mt-2 font-display text-5xl">搜索文章</h1>
    <p class="mt-4 max-w-2xl leading-7 text-ink/65">
      输入关键词后，会按文章标题和正文内容检索；结果链接会同步到地址栏，方便分享或再次打开。
    </p>

    <form
      class="ui-surface-soft mt-8 grid max-w-2xl gap-3 p-4"
      role="search"
      @submit.prevent
    >
      <label class="text-sm font-medium text-ink/60" for="search-keyword">
        文章标题或正文
      </label>
      <input
        id="search-keyword"
        v-model="keyword"
        class="focus-ring w-full rounded-md border border-line bg-white px-4 py-3"
        placeholder="输入关键词"
        type="search"
      />
    </form>

    <div class="mt-5 flex flex-wrap items-center gap-3 text-sm text-ink/58">
      <span v-if="contentStore.loading">正在搜索...</span>
      <span v-else>找到 {{ contentStore.publicMeta.total || results.length }} 篇文章</span>
      <span v-if="normalizedKeyword">关键词：{{ keyword.trim() }}</span>
      <span v-if="contentStore.errorMessage" class="text-coral">
        {{ contentStore.errorMessage }}
      </span>
    </div>

    <div v-if="results.length" class="mt-8 grid gap-5">
      <ArticleCard
        v-for="article in results"
        :key="article.id"
        :article="article"
      />
    </div>
    <div v-else class="ui-surface mt-8 p-6">
      <h2 class="font-display text-3xl">没有匹配的文章</h2>
      <p class="mt-3 leading-7 text-ink/65">
        换一个标题或正文里的关键词再试试。
      </p>
    </div>
  </section>
</template>
