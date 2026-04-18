<script setup lang="ts">
import { computed, onMounted } from "vue";
import ArticleCard from "@/components/ArticleCard.vue";
import StatPill from "@/components/StatPill.vue";
import { useCommunityStore } from "@/stores/community";
import { useContentStore } from "@/stores/content";
import { useSiteStore } from "@/stores/site";
import type { Article } from "@/types/blog";

const siteStore = useSiteStore();
const contentStore = useContentStore();
const communityStore = useCommunityStore();
const allArticles = computed(() => contentStore.publishedArticles);
const heroArticle = computed(() => allArticles.value[0]);
const storyArticles = computed(() => {
  const selected: Article[] = [];
  const seenImages = new Set<string>();

  if (heroArticle.value?.coverImage) {
    seenImages.add(heroArticle.value.coverImage);
  }

  for (const article of allArticles.value.slice(1)) {
    if (!article.coverImage || seenImages.has(article.coverImage)) {
      continue;
    }

    selected.push(article);
    seenImages.add(article.coverImage);

    if (selected.length === 5) {
      break;
    }
  }

  return selected;
});
const storyArticleIds = computed(
  () => new Set(storyArticles.value.map((article) => article.id)),
);
const feedArticles = computed(() =>
  allArticles.value
    .slice(1)
    .filter((article) => !storyArticleIds.value.has(article.id)),
);
const popularTags = computed(() => contentStore.tagCloud);
const highlightTags = computed(() => popularTags.value.slice(0, 14));
const popularArticles = computed(() =>
  [...allArticles.value]
    .sort((left, right) => right.viewCount - left.viewCount)
    .slice(0, 4),
);

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

onMounted(async () => {
  await Promise.all([
    contentStore.loadPublicContent(),
    communityStore.loadPublicCommunity(),
  ]);
});
</script>

<template>
  <section
    v-if="heroArticle"
    class="home-screen home-hero"
    aria-labelledby="home-hero-title"
  >
    <img
      class="home-hero__image"
      :alt="heroArticle.title"
      :src="heroArticle.coverImage"
      width="1800"
      height="1200"
      fetchpriority="high"
    />
    <div class="home-hero__shade"></div>
    <div class="content-shell home-hero__content">
      <p class="home-kicker">{{ siteStore.settings.subtitle }}</p>
      <p class="home-meta">
        {{ heroArticle.category.name }} /
        {{ formatDate(heroArticle.publishedAt) }}
      </p>
      <h1 id="home-hero-title" class="home-hero__title">
        {{ heroArticle.title }}
      </h1>
      <p class="home-hero__excerpt">{{ heroArticle.excerpt }}</p>
      <div class="home-actions">
        <RouterLink
          class="focus-ring home-button home-button--light"
          :to="`/articles/${heroArticle.slug}`"
        >
          阅读最新文章
        </RouterLink>
        <a class="focus-ring home-button home-button--ghost" href="#home-feed">
          继续向下
        </a>
      </div>
    </div>
  </section>

  <section v-else-if="contentStore.loading" class="home-loading">
    <div class="content-shell home-loading__grid">
      <div class="home-loading__block animate-pulse"></div>
      <div class="home-loading__line animate-pulse"></div>
      <div
        class="home-loading__line home-loading__line--short animate-pulse"
      ></div>
    </div>
  </section>

  <section v-else class="home-empty">
    <div class="content-shell">
      <div class="ui-surface p-6 md:p-8">
        <p class="eyebrow">Content</p>
        <h1 class="mt-2 font-display text-5xl">还没有公开文章</h1>
        <p class="mt-4 max-w-2xl text-ink/66">
          文章发布后会出现在这里。若你刚完成部署，请先确认公开文章接口和发布状态。
        </p>
      </div>
    </div>
  </section>

  <section v-if="contentStore.errorMessage" class="content-shell pb-2">
    <p
      class="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ contentStore.errorMessage }}
    </p>
  </section>

  <section
    v-if="communityStore.announcements.length"
    class="content-shell py-6"
    aria-label="站点公告"
  >
    <div class="grid gap-4 lg:grid-cols-[0.7fr_1fr]">
      <div>
        <p class="eyebrow">Notice</p>
        <h2 class="mt-2 font-display text-4xl text-brand">公告栏</h2>
      </div>
      <div class="grid gap-3">
        <article
          v-for="announcement in communityStore.announcements"
          :key="announcement.id"
          class="ui-surface-soft rounded-md p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="font-semibold text-brand">{{ announcement.title }}</h3>
            <span class="text-xs text-ink/48">
              {{ new Date(announcement.publishedAt).toLocaleDateString("zh-CN") }}
            </span>
          </div>
          <p class="mt-2 leading-7 text-ink/65">{{ announcement.content }}</p>
        </article>
      </div>
    </div>
  </section>

  <section
    v-if="storyArticles.length"
    class="home-stories"
    aria-label="精选文章"
  >
    <article
      v-for="(article, index) in storyArticles"
      :key="article.id"
      class="home-screen home-story"
      :class="{ 'home-story--reverse': index % 2 === 1 }"
    >
      <RouterLink
        class="focus-ring home-story__media"
        :to="`/articles/${article.slug}`"
      >
        <img
          class="home-story__image"
          :alt="article.title"
          :src="article.coverImage"
          width="1500"
          height="1000"
          loading="lazy"
        />
      </RouterLink>
      <div class="content-shell home-story__content">
        <p class="home-kicker">
          Scroll Essay {{ String(index + 1).padStart(2, "0") }}
        </p>
        <p class="home-story__meta">
          {{ article.category.name }} / {{ formatDate(article.publishedAt) }} /
          {{ article.viewCount }} 阅读
        </p>
        <RouterLink
          class="focus-ring rounded-md"
          :to="`/articles/${article.slug}`"
        >
          <h2 class="home-story__title">{{ article.title }}</h2>
        </RouterLink>
        <p class="home-story__excerpt">{{ article.excerpt }}</p>
        <RouterLink
          class="focus-ring home-button home-button--ink"
          :to="`/articles/${article.slug}`"
        >
          进入这一篇
        </RouterLink>
      </div>
    </article>
  </section>

  <section id="home-feed" class="home-feed">
    <div class="content-shell home-feed__layout">
      <div class="home-feed__intro">
        <p class="eyebrow">Latest</p>
        <h2 class="mt-2 font-display text-5xl leading-tight">最近更新</h2>
        <p class="mt-4 max-w-xl leading-7 text-ink/72">
          按发布时间继续往下读。真实封面来自文章数据库，新的公开文章会自动进入这条时间线。
        </p>
      </div>

      <div class="home-feed__list">
        <ArticleCard
          v-for="article in feedArticles"
          :key="article.id"
          :article="article"
        />
        <div
          v-if="!contentStore.loading && !feedArticles.length"
          class="ui-surface p-6"
        >
          <h2 class="font-display text-3xl">暂无更多文章</h2>
          <p class="mt-3 leading-7 text-ink/65">
            当前公开文章数量不足以填满列表，发布更多文章后这里会继续更新。
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="home-index">
    <div class="content-shell home-index__layout">
      <div>
        <p class="eyebrow">Index</p>
        <h2 class="mt-2 font-display text-5xl leading-tight">继续探索</h2>
        <p class="mt-4 max-w-2xl leading-7 text-ink/70">
          标签和数据留在页面末尾，像一张索引卡，帮你从文章流里换一个方向进入。
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <StatPill label="文章" :value="siteStore.stats.articles" />
        <StatPill label="阅读" :value="siteStore.stats.views" />
        <StatPill label="评论" :value="siteStore.stats.comments" />
      </div>

      <div
        v-if="communityStore.visitorStats"
        class="grid gap-4 md:grid-cols-3"
      >
        <StatPill
          label="访问量"
          :value="communityStore.visitorStats.totalViews"
        />
        <StatPill
          label="访客"
          :value="communityStore.visitorStats.uniqueVisitors"
        />
        <StatPill
          label="平均停留"
          :value="`${communityStore.visitorStats.avgStaySeconds}s`"
        />
      </div>

      <div v-if="highlightTags.length" class="home-tags">
        <RouterLink
          v-for="tag in highlightTags"
          :key="tag.id"
          class="focus-ring home-tag"
          :to="`/tags?tag=${tag.slug}`"
        >
          #{{ tag.name }} {{ tag.articleCount }}
        </RouterLink>
      </div>
      <p v-else class="text-sm text-ink/58">暂无标签数据</p>

      <div class="home-popular">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow">Popular</p>
            <h3 class="mt-2 font-display text-4xl leading-tight text-brand">
              热门文章
            </h3>
          </div>
          <RouterLink class="focus-ring ui-button-secondary px-4 py-2" to="/archives">
            查看归档
          </RouterLink>
        </div>

        <div v-if="popularArticles.length" class="mt-5 grid gap-3 md:grid-cols-2">
          <RouterLink
            v-for="article in popularArticles"
            :key="article.id"
            class="focus-ring ui-surface-soft grid gap-2 p-4 hover:border-brand/30 hover:bg-white/90"
            :to="`/articles/${article.slug}`"
          >
            <div class="flex flex-wrap items-center gap-2 text-xs text-ink/48">
              <span>{{ article.viewCount }} 阅读</span>
              <span>{{ article.commentCount }} 评论</span>
              <span>{{ formatDate(article.publishedAt) }}</span>
            </div>
            <h3 class="font-display text-3xl leading-tight text-ink">
              {{ article.title }}
            </h3>
            <p class="line-clamp-2 leading-7 text-ink/66">{{ article.excerpt }}</p>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
