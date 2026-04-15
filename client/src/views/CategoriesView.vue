<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { listArticles, listCategories } from "@/services/blog";
import { useContentStore } from "@/stores/content";

const route = useRoute();
const contentStore = useContentStore();
const categories = computed(() => listCategories());
const selectedSlug = computed(() => String(route.query.category ?? ""));
const selectedCategory = computed(() =>
  categories.value.find((category) => category.slug === selectedSlug.value),
);
const categoryArticles = computed(() =>
  selectedCategory.value
    ? listArticles().filter(
        (article) => article.category.id === selectedCategory.value?.id,
      )
    : [],
);

function loadCategoryArticles() {
  void contentStore.loadPublicContent(
    selectedCategory.value ? { categoryId: selectedCategory.value.id } : {},
  );
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
    </section>
  </section>
</template>
