<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { useContentStore } from "@/stores/content";

const route = useRoute();
const contentStore = useContentStore();
const categories = computed(() => contentStore.visibleCategories);
const selectedSlug = computed(() => String(route.query.category ?? ""));
const selectedCategory = computed(() =>
  categories.value.find((category) => category.slug === selectedSlug.value),
);
const categoryArticles = computed(() => contentStore.publishedArticles);

function loadCategoryArticles() {
  void contentStore
    .loadPublicContent(
      selectedCategory.value ? { categoryId: selectedCategory.value.id } : {},
    )
    .catch(() => undefined);
}

onMounted(loadCategoryArticles);
watch(() => selectedCategory.value?.id, loadCategoryArticles);
</script>

<template>
  <section class="content-shell py-12">
    <p class="eyebrow">Categories</p>
    <h1 class="mt-2 font-display text-5xl">文章分类</h1>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <RouterLink
        v-for="category in categories"
        :key="category.id"
        class="focus-ring ui-surface ui-hover-lift p-5"
        :to="`/categories?category=${category.slug}`"
      >
        <div
          class="h-1 w-16"
          :style="{ backgroundColor: category.color }"
        ></div>
        <h2 class="mt-5 font-display text-3xl">{{ category.name }}</h2>
        <p class="mt-3 leading-7 text-ink/65">{{ category.description }}</p>
        <p class="mt-5 text-sm text-ink/55">
          {{ category.articleCount }} 篇文章
        </p>
      </RouterLink>
    </div>

    <p
      v-if="contentStore.errorMessage"
      class="mt-6 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ contentStore.errorMessage }}
    </p>

    <div v-if="contentStore.loading" class="mt-8 grid gap-4 md:grid-cols-2">
      <div v-for="index in 2" :key="index" class="ui-surface h-40 animate-pulse bg-line/40"></div>
    </div>

    <section v-if="selectedCategory" class="mt-10">
      <p class="eyebrow">Selected</p>
      <h2 class="mt-2 font-display text-4xl">
        {{ selectedCategory.name }} 下的文章
      </h2>
      <div class="mt-6 grid gap-5">
        <ArticleCard
          v-for="article in categoryArticles"
          :key="article.id"
          :article="article"
        />
      </div>
      <div
        v-if="!contentStore.loading && !categoryArticles.length"
        class="ui-surface mt-6 p-6"
      >
        <h3 class="font-display text-3xl">该分类下暂无公开文章</h3>
        <p class="mt-3 leading-7 text-ink/65">
          可以切换其他分类，或者检查后台里文章是否已发布并设置为公开。
        </p>
      </div>
    </section>
  </section>
</template>
