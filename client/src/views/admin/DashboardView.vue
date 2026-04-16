<script setup lang="ts">
import { computed, onMounted } from "vue";
import StatPill from "@/components/StatPill.vue";
import { useContentStore } from "@/stores/content";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const contentStore = useContentStore();
const articles = computed(() =>
  siteStore.recentArticles.length
    ? siteStore.recentArticles
    : [...contentStore.articles]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 5)
        .map((article) => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
          viewCount: article.viewCount,
          commentCount: article.commentCount,
          publishedAt: article.publishedAt || null,
          createdAt: article.createdAt,
        })),
);

onMounted(() => {
  void contentStore.loadAdminContent();
  void siteStore.loadDashboardStats();
  void siteStore.loadRecentArticles(5);
});
</script>

<template>
  <div>
    <p class="eyebrow">Dashboard</p>
    <h1 class="mt-2 font-display text-5xl">数据概览</h1>

    <p
      v-if="siteStore.statsError"
      class="mt-5 rounded-md border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral"
    >
      {{ siteStore.statsError }}
    </p>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <StatPill label="文章总数" :value="siteStore.stats.articles" />
      <StatPill label="总阅读量" :value="siteStore.stats.views" />
      <StatPill label="评论总数" :value="siteStore.stats.comments" />
    </div>

    <p v-if="siteStore.statsLoading" class="mt-4 text-sm text-ink/55">
      正在同步后台统计...
    </p>
    <p
      v-if="siteStore.recentArticlesError"
      class="mt-3 rounded-md border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral"
    >
      {{ siteStore.recentArticlesError }}
    </p>

    <section class="ui-surface mt-8 overflow-hidden">
      <div class="border-b border-line p-5">
        <h2 class="font-display text-3xl">最近文章</h2>
      </div>
      <div class="divide-y divide-line">
        <div
          v-for="article in articles"
          :key="article.id"
          class="grid gap-2 p-5 transition-colors duration-200 hover:bg-paper md:grid-cols-[1fr_auto]"
        >
          <div>
            <p class="font-semibold">{{ article.title }}</p>
            <p class="mt-1 text-sm text-ink/55">
              {{ article.status }} · {{ article.commentCount }} 评论
            </p>
          </div>
          <p class="font-mono text-sm text-ink/55">
            {{ article.viewCount }} 阅读
          </p>
        </div>
      </div>
      <p
        v-if="siteStore.recentArticlesLoading"
        class="border-t border-line p-5 text-sm text-ink/55"
      >
        正在同步最近文章...
      </p>
    </section>
  </div>
</template>
