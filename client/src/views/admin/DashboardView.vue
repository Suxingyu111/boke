<script setup lang="ts">
import StatPill from "@/components/StatPill.vue";
import { listArticles } from "@/services/blog";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const articles = listArticles();
</script>

<template>
  <div>
    <p class="text-sm text-coral">Dashboard</p>
    <h1 class="mt-2 font-display text-5xl">数据概览</h1>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <StatPill label="文章总数" :value="siteStore.stats.articles" />
      <StatPill label="总阅读量" :value="siteStore.stats.views" />
      <StatPill label="评论总数" :value="siteStore.stats.comments" />
    </div>

    <section class="mt-8 border border-line bg-white">
      <div class="border-b border-line p-4">
        <h2 class="font-display text-3xl">最近文章</h2>
      </div>
      <div class="divide-y divide-line">
        <div
          v-for="article in articles"
          :key="article.id"
          class="grid gap-2 p-4 md:grid-cols-[1fr_auto]"
        >
          <div>
            <p class="font-semibold">{{ article.title }}</p>
            <p class="mt-1 text-sm text-ink/55">
              {{ article.category.name }} · {{ article.status }}
            </p>
          </div>
          <p class="text-sm text-ink/55">{{ article.viewCount }} 阅读</p>
        </div>
      </div>
    </section>
  </div>
</template>
