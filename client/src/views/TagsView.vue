<script setup lang="ts">
import { listTags } from "@/services/blog";

const tags = listTags();
</script>

<template>
  <section class="content-shell py-12">
    <p class="text-sm text-coral">Tags</p>
    <h1 class="mt-2 font-display text-5xl">标签索引</h1>

    <div class="mt-8 flex flex-wrap gap-3">
      <RouterLink
        v-for="tag in tags"
        :key="tag.id"
        class="focus-ring rounded-md border border-line bg-white px-4 py-3 hover:border-moss hover:text-moss"
        :to="`/tags?tag=${tag.slug}`"
      >
        #{{ tag.name }} <span class="text-ink/45">{{ tag.articleCount }}</span>
      </RouterLink>
    </div>
  </section>
</template>
