<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { useContentStore } from "@/stores/content";

const route = useRoute();
const contentStore = useContentStore();
const tags = computed(() => contentStore.tagCloud);
const selectedSlug = computed(() => String(route.query.tag ?? ""));
const selectedTag = computed(() =>
  tags.value.find((tag) => tag.slug === selectedSlug.value),
);
const tagArticles = computed(() => contentStore.publishedArticles);

function loadTagArticles() {
  void contentStore
    .loadPublicContent(selectedTag.value ? { tagId: selectedTag.value.id } : {})
    .catch(() => undefined);
}

onMounted(loadTagArticles);
watch(() => selectedTag.value?.id, loadTagArticles);
</script>

<template>
  <section class="content-shell py-12">
    <p class="eyebrow">Tags</p>
    <h1 class="mt-2 font-display text-5xl">标签索引</h1>

    <div class="mt-8 flex flex-wrap gap-3">
      <RouterLink
        v-for="tag in tags"
        :key="tag.id"
        class="focus-ring min-h-11 rounded-md border border-line bg-white px-4 py-3 shadow-insetline hover:-translate-y-0.5 hover:border-moss hover:text-moss hover:shadow-lifted"
        :to="`/tags?tag=${tag.slug}`"
      >
        #{{ tag.name }} <span class="text-ink/45">{{ tag.articleCount }}</span>
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

    <section v-if="selectedTag" class="mt-10">
      <p class="eyebrow">Selected</p>
      <h2 class="mt-2 font-display text-4xl">#{{ selectedTag.name }}</h2>
      <div class="mt-6 grid gap-5">
        <ArticleCard
          v-for="article in tagArticles"
          :key="article.id"
          :article="article"
        />
      </div>
      <div
        v-if="!contentStore.loading && !tagArticles.length"
        class="ui-surface mt-6 p-6"
      >
        <h3 class="font-display text-3xl">该标签下暂无公开文章</h3>
        <p class="mt-3 leading-7 text-ink/65">
          你可以尝试其他标签，或者检查后台文章是否已经绑定标签并公开发布。
        </p>
      </div>
    </section>
  </section>
</template>
