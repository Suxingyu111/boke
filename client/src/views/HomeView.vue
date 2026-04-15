<script setup lang="ts">
import ArticleCard from "@/components/ArticleCard.vue";
import StatPill from "@/components/StatPill.vue";
import { listArticles, listTags } from "@/services/blog";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const allArticles = listArticles();
const featuredArticle = allArticles[0];
const latestArticles = allArticles.slice(1);
const popularTags = listTags();
</script>

<template>
  <section class="border-b border-line bg-white">
    <div
      class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch"
    >
      <div
        class="flex min-h-[420px] flex-col justify-end bg-ink p-6 text-paper md:p-10"
      >
        <p class="text-sm text-citron">{{ siteStore.settings.subtitle }}</p>
        <h1
          class="mt-5 max-w-3xl font-display text-5xl leading-tight md:text-6xl"
        >
          {{ featuredArticle.title }}
        </h1>
        <p class="mt-5 max-w-2xl text-lg text-paper/75">
          {{ featuredArticle.excerpt }}
        </p>
        <RouterLink
          class="focus-ring mt-8 w-fit rounded-md bg-citron px-5 py-3 font-semibold text-ink hover:bg-paper"
          :to="`/articles/${featuredArticle.slug}`"
        >
          阅读最新文章
        </RouterLink>
      </div>

      <RouterLink
        class="focus-ring block min-h-[320px] overflow-hidden rounded-md"
        :to="`/articles/${featuredArticle.slug}`"
      >
        <img
          class="h-full w-full object-cover"
          :alt="featuredArticle.title"
          :src="featuredArticle.coverImage"
        />
      </RouterLink>
    </div>
  </section>

  <section class="content-shell grid gap-4 py-8 md:grid-cols-3">
    <StatPill label="文章" :value="siteStore.stats.articles" />
    <StatPill label="阅读" :value="siteStore.stats.views" />
    <StatPill label="评论" :value="siteStore.stats.comments" />
  </section>

  <section
    class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_280px]"
  >
    <div class="grid gap-5">
      <div>
        <p class="text-sm text-coral">Latest</p>
        <h2 class="mt-2 font-display text-4xl">最近更新</h2>
      </div>
      <ArticleCard
        v-for="article in latestArticles"
        :key="article.id"
        :article="article"
      />
    </div>

    <aside class="h-fit border border-line bg-white p-5">
      <h2 class="font-display text-3xl">标签云</h2>
      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink
          v-for="tag in popularTags"
          :key="tag.id"
          class="focus-ring rounded-md border border-line px-3 py-2 text-sm hover:border-coral hover:text-coral"
          :to="`/tags?tag=${tag.slug}`"
        >
          #{{ tag.name }} {{ tag.articleCount }}
        </RouterLink>
      </div>
    </aside>
  </section>
</template>
