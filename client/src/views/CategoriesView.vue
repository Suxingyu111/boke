<script setup lang="ts">
import { listCategories } from "@/services/blog";

const categories = listCategories();
</script>

<template>
  <section class="content-shell py-12">
    <p class="text-sm text-coral">Categories</p>
    <h1 class="mt-2 font-display text-5xl">文章分类</h1>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <RouterLink
        v-for="category in categories"
        :key="category.id"
        class="focus-ring border border-line bg-white p-5 hover:shadow-editorial"
        :to="`/categories?category=${category.slug}`"
      >
        <div
          class="h-1 w-16"
          :style="{ backgroundColor: category.color }"
        ></div>
        <h2 class="mt-5 font-display text-3xl">{{ category.name }}</h2>
        <p class="mt-3 text-ink/65">{{ category.description }}</p>
        <p class="mt-5 text-sm text-ink/55">
          {{ category.articleCount }} 篇文章
        </p>
      </RouterLink>
    </div>
  </section>
</template>
