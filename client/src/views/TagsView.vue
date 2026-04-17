<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { getApiErrorMessage } from "@/api/auth";
import { useContentStore } from "@/stores/content";

const route = useRoute();
const contentStore = useContentStore();
const tags = computed(() => contentStore.tagCloud);
const selectedSlug = computed(() => String(route.query.tag ?? ""));
const selectedTag = computed(() =>
  tags.value.find((tag) => tag.slug === selectedSlug.value),
);
const tagArticles = computed(() => contentStore.publishedArticles);

async function loadTagArticles() {
  await contentStore.loadPublicContent(
    selectedTag.value ? { tagId: selectedTag.value.id } : {},
  );
}

onMounted(async () => {
  try {
    await loadTagArticles();
  } catch (error) {
    contentStore.errorMessage = getApiErrorMessage(error, "标签文章加载失败");
  }
});

watch(
  () => selectedTag.value?.id,
  async () => {
    try {
      await loadTagArticles();
    } catch (error) {
      contentStore.errorMessage = getApiErrorMessage(error, "标签文章加载失败");
    }
  },
);
</script>

<template>
  <section class="content-shell py-10 md:py-14">
    <div class="mb-8">
      <p class="eyebrow">Tags</p>
      <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">
        标签索引
      </h1>
      <p class="mt-3 max-w-2xl leading-7 text-ink/66">
        更细粒度地按关键词聚合阅读路径。
      </p>
    </div>

    <div class="ui-surface-soft mt-6 flex flex-wrap gap-3 p-4">
      <RouterLink
        v-for="tag in tags"
        :key="tag.id"
        class="focus-ring min-h-11 rounded-md border px-4 py-3 shadow-insetline"
        :class="
          tag.slug === selectedSlug
            ? 'border-brand/55 bg-brand/10 text-brand shadow-lifted'
            : 'border-line bg-white/88 hover:-translate-y-0.5 hover:border-brand/45 hover:text-brand hover:shadow-lifted'
        "
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
      <div
        v-for="index in 2"
        :key="index"
        class="ui-surface h-40 animate-pulse bg-line/40"
      ></div>
    </div>

    <section v-if="selectedTag" class="mt-12">
      <p class="eyebrow">Selected</p>
      <h2 class="mt-2 font-display text-4xl text-brand">
        #{{ selectedTag.name }}
      </h2>
      <p class="mt-3 text-sm text-ink/58">
        收录 {{ selectedTag.articleCount }} 篇公开文章
      </p>
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
        <h3 class="font-display text-3xl text-brand">该标签下暂无公开文章</h3>
        <p class="mt-3 leading-7 text-ink/65">
          你可以尝试其他标签，或者检查后台文章是否已经绑定标签并公开发布。
        </p>
      </div>
    </section>
  </section>
</template>
