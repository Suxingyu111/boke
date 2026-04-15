<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { listArticles, listTags } from "@/services/blog";
import { useContentStore } from "@/stores/content";

const route = useRoute();
const contentStore = useContentStore();
const tags = computed(() => listTags());
const selectedSlug = computed(() => String(route.query.tag ?? ""));
const selectedTag = computed(() =>
  tags.value.find((tag) => tag.slug === selectedSlug.value),
);
const tagArticles = computed(() =>
  selectedTag.value
    ? listArticles().filter((article) =>
        article.tags.some((tag) => tag.id === selectedTag.value?.id),
      )
    : [],
);

function loadTagArticles() {
  void contentStore.loadPublicContent(
    selectedTag.value ? { tagId: selectedTag.value.id } : {},
  );
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
    </section>
  </section>
</template>
