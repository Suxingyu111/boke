<script setup lang="ts">
import type { Article } from "@/types/blog";

defineProps<{
  article: Article;
}>();
</script>

<template>
  <article
    class="ui-surface ui-hover-lift group grid overflow-hidden !rounded-[8px] sm:grid-cols-[160px_minmax(0,1fr)]"
  >
    <RouterLink
      class="block aspect-[4/3] overflow-hidden bg-line/40 sm:aspect-auto sm:min-h-full"
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

    <div class="flex flex-col gap-1.5 p-3 sm:p-4">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/55">
        <span
          class="rounded border border-line bg-white/84 px-1.5 py-0.5 font-semibold"
          :style="{ color: article.category.color }"
        >
          {{ article.category.name }}
        </span>
        <span>{{ new Date(article.publishedAt).toLocaleDateString("zh-CN") }}</span>
        <span>{{ article.viewCount }} 阅读</span>
      </div>

      <RouterLink
        class="focus-ring rounded"
        :to="`/articles/${article.slug}`"
      >
        <h2
          class="line-clamp-2 font-display text-xl leading-snug text-ink transition-colors duration-200 group-hover:text-brand"
        >
          {{ article.title }}
        </h2>
      </RouterLink>

      <p class="line-clamp-2 text-sm leading-6 text-ink/65">{{ article.excerpt }}</p>

      <div class="mt-auto flex flex-wrap gap-1.5 pt-1">
        <RouterLink
          v-for="tag in article.tags.slice(0, 3)"
          :key="tag.id"
          class="focus-ring rounded bg-wash/78 px-1.5 py-0.5 text-xs text-ink/60 hover:bg-accent-soft hover:text-coral"
          :to="`/tags?tag=${tag.slug}`"
        >
          #{{ tag.name }}
        </RouterLink>
        <span
          v-if="article.tags.length > 3"
          class="px-1 text-xs text-ink/40"
        >+{{ article.tags.length - 3 }}</span>
      </div>
    </div>
  </article>
</template>
