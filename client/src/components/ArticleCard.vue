<script setup lang="ts">
import type { Article } from "@/types/blog";

defineProps<{
  article: Article;
}>();
</script>

<template>
  <article
    class="ui-surface ui-hover-lift group grid overflow-hidden !rounded-[8px] md:grid-cols-[260px_minmax(0,1fr)]"
  >
    <RouterLink
      class="block aspect-[4/3] overflow-hidden bg-line/40 md:aspect-auto md:min-h-full"
      :to="`/articles/${article.slug}`"
    >
      <img
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        :alt="article.title"
        :src="article.coverImage"
        width="720"
        height="480"
        loading="lazy"
      />
    </RouterLink>

    <div class="grid gap-4 p-5 md:p-6">
      <div class="flex flex-wrap items-center gap-2 text-sm text-ink/62">
        <span
          class="rounded-md border border-line bg-white/84 px-2 py-1 font-semibold"
          :style="{ color: article.category.color }"
        >
          {{ article.category.name }}
        </span>
        <span>{{
          new Date(article.publishedAt).toLocaleDateString("zh-CN")
        }}</span>
        <span>{{ article.viewCount }} 阅读</span>
      </div>

      <RouterLink
        class="focus-ring rounded-md"
        :to="`/articles/${article.slug}`"
      >
        <h2
          class="font-display text-[2rem] leading-tight text-ink transition-colors duration-200 group-hover:text-brand"
        >
          {{ article.title }}
        </h2>
      </RouterLink>

      <p class="leading-7 text-ink/74">{{ article.excerpt }}</p>

      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-for="tag in article.tags"
          :key="tag.id"
          class="focus-ring rounded-md bg-wash/78 px-2 py-1 text-sm text-ink/70 hover:bg-accent-soft hover:text-coral"
          :to="`/tags?tag=${tag.slug}`"
        >
          #{{ tag.name }}
        </RouterLink>
      </div>
    </div>
  </article>
</template>
