<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import ArticleCard from "@/components/ArticleCard.vue";
import StatPill from "@/components/StatPill.vue";
import { useContentStore } from "@/stores/content";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const contentStore = useContentStore();
const currentPage = ref(1);
const pageSize = 4;
const allArticles = computed(() => contentStore.publishedArticles);
const featuredArticle = computed(() => allArticles.value[0]);
const latestArticles = computed(() => allArticles.value.slice(1));
const totalPages = computed(() =>
  Math.max(1, Math.ceil(latestArticles.value.length / pageSize)),
);
const pagedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return latestArticles.value.slice(start, start + pageSize);
});
const popularTags = computed(() => contentStore.tagCloud);

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

onMounted(() => {
  void contentStore.loadPublicContent().catch(() => undefined);
});
</script>

<template>
  <section v-if="featuredArticle" class="border-b border-line/80 bg-white/72">
    <div
      class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch"
    >
      <div
        class="relative flex min-h-[460px] flex-col justify-end overflow-hidden rounded-md bg-ink p-6 text-paper shadow-editorial md:p-10"
      >
        <div
          class="absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,#f0c808,#c6283f,#185c52)]"
        ></div>
        <p class="text-sm font-semibold text-citron">
          {{ siteStore.settings.subtitle }}
        </p>
        <h1
          class="mt-5 max-w-3xl font-display text-5xl leading-tight md:text-7xl"
        >
          {{ featuredArticle.title }}
        </h1>
        <p class="mt-5 max-w-2xl text-lg text-paper/75">
          {{ featuredArticle.excerpt }}
        </p>
        <RouterLink
          class="focus-ring mt-8 min-h-11 w-fit rounded-md bg-citron px-5 py-3 font-semibold text-ink shadow-lifted hover:bg-paper hover:-translate-y-0.5"
          :to="`/articles/${featuredArticle.slug}`"
        >
          阅读最新文章
        </RouterLink>
      </div>

      <RouterLink
        class="focus-ring ui-hover-lift block min-h-[320px] overflow-hidden rounded-md shadow-lifted"
        :to="`/articles/${featuredArticle.slug}`"
      >
        <img
          class="h-full w-full object-cover"
          :alt="featuredArticle.title"
          :src="featuredArticle.coverImage"
        />
      </RouterLink>
    </div>
  </section>

  <section
    v-else-if="contentStore.loading"
    class="border-b border-line/80 bg-white/72"
  >
    <div class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div class="ui-surface min-h-[460px] animate-pulse bg-line/40"></div>
      <div class="ui-surface min-h-[320px] animate-pulse bg-line/40"></div>
    </div>
  </section>

  <section v-else class="border-b border-line/80 bg-white/72">
    <div class="content-shell py-12">
      <div class="ui-surface p-6 md:p-8">
        <p class="eyebrow">Content</p>
        <h1 class="mt-2 font-display text-5xl">还没有公开文章</h1>
        <p class="mt-4 max-w-2xl text-ink/65">
          文章发布后会出现在这里。若你刚完成部署，请先确认公开文章接口和发布状态。
        </p>
      </div>
    </div>
  </section>

  <section class="content-shell grid gap-4 py-8 md:grid-cols-3">
    <StatPill label="文章" :value="siteStore.stats.articles" />
    <StatPill label="阅读" :value="siteStore.stats.views" />
    <StatPill label="评论" :value="siteStore.stats.comments" />
  </section>

  <section v-if="contentStore.errorMessage" class="content-shell pb-2">
    <p
      class="rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ contentStore.errorMessage }}
    </p>
  </section>

  <section
    class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_280px]"
  >
    <div class="grid gap-5">
      <div>
        <p class="eyebrow">Latest</p>
        <h2 class="mt-2 font-display text-4xl">最近更新</h2>
      </div>
      <ArticleCard
        v-for="article in pagedArticles"
        :key="article.id"
        :article="article"
      />
      <div v-if="!contentStore.loading && !pagedArticles.length" class="ui-surface p-6">
        <h2 class="font-display text-3xl">暂无更多文章</h2>
        <p class="mt-3 leading-7 text-ink/65">
          当前公开文章数量不足以填满列表，发布更多文章后这里会继续更新。
        </p>
      </div>
      <div
        v-if="totalPages > 1"
        class="ui-surface-soft flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <p class="text-sm text-ink/55">
          第 {{ currentPage }} / {{ totalPages }} 页，按发布时间倒序
        </p>
        <div class="flex gap-2">
          <button
            class="focus-ring ui-button-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage === 1"
            type="button"
            @click="currentPage -= 1"
          >
            上一页
          </button>
          <button
            class="focus-ring ui-button-primary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage === totalPages"
            type="button"
            @click="currentPage += 1"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <aside class="ui-surface h-fit p-5">
      <h2 class="font-display text-3xl">标签云</h2>
      <div v-if="popularTags.length" class="mt-4 flex flex-wrap gap-2">
        <RouterLink
          v-for="tag in popularTags"
          :key="tag.id"
          class="focus-ring min-h-11 rounded-md border border-line bg-paper px-3 py-2 text-sm hover:border-coral hover:bg-white hover:text-coral"
          :to="`/tags?tag=${tag.slug}`"
        >
          #{{ tag.name }} {{ tag.articleCount }}
        </RouterLink>
      </div>
      <p v-else class="mt-4 text-sm text-ink/55">暂无标签数据</p>
    </aside>
  </section>
</template>
