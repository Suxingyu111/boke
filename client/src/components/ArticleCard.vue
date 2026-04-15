<script setup lang="ts">
import type { Article } from "@/types/blog";

defineProps<{
  article: Article;
}>();
</script>

<template>
  <article
    class="ui-surface ui-hover-lift group grid overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]"
  >
    <RouterLink
      class="block min-h-52 overflow-hidden bg-line md:min-h-full"
      :to="`/articles/${article.slug}`"
    >
      <img
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        :alt="article.title"
        :src="article.coverImage"
      />
    </RouterLink>

    <div class="grid gap-4 p-5">
      <div class="flex flex-wrap items-center gap-2 text-sm text-ink/60">
        <span
          class="rounded-md border border-line bg-paper px-2 py-1 font-medium"
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
          class="font-display text-3xl leading-tight transition-colors duration-200 group-hover:text-moss"
        >
          {{ article.title }}
        </h2>
      </RouterLink>

      <p class="leading-7 text-ink/70">{{ article.excerpt }}</p>

      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-for="tag in article.tags"
          :key="tag.id"
          class="focus-ring rounded-md bg-paper px-2 py-1 text-sm text-ink/70 hover:bg-wash hover:text-coral"
          :to="`/tags?tag=${tag.slug}`"
        >
          #{{ tag.name }}
        </RouterLink>
      </div>
    </div>
  </article>
</template>
