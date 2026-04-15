<script setup lang="ts">
import { computed, ref } from "vue";
import ArticleCard from "@/components/ArticleCard.vue";
import { listArticles } from "@/services/blog";

const keyword = ref("");
const results = computed(() => listArticles(keyword.value));
</script>

<template>
  <section class="content-shell py-12">
    <p class="text-sm text-coral">Search</p>
    <h1 class="mt-2 font-display text-5xl">搜索文章</h1>

    <label class="mt-8 block max-w-2xl">
      <span class="text-sm text-ink/60">标题、摘要或正文</span>
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
