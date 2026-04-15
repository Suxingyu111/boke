<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import ArticleCard from "@/components/ArticleCard.vue";
import { listArticles } from "@/services/blog";
import { useContentStore } from "@/stores/content";

const contentStore = useContentStore();
const keyword = ref("");
const results = computed(() => listArticles(keyword.value));

onMounted(() => {
  void contentStore.loadPublicContent();
});

watch(keyword, (value) => {
  void contentStore.loadPublicContent({ keyword: value.trim() || undefined });
});
</script>

<template>
  <section class="content-shell py-12">
    <p class="eyebrow">Search</p>
    <h1 class="mt-2 font-display text-5xl">搜索文章</h1>

    <label class="ui-surface-soft mt-8 block max-w-2xl p-4">
      <span class="text-sm font-medium text-ink/60">标题、摘要或正文</span>
      <input
        v-model="keyword"
        class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-4 py-3"
        placeholder="输入关键词"
        type="search"
      />
    </label>

    <div class="mt-8 grid gap-5">
      <ArticleCard
        v-for="article in results"
        :key="article.id"
        :article="article"
      />
    </div>
  </section>
</template>
