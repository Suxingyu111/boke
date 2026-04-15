<script setup lang="ts">
import { computed, onMounted } from "vue";
import StatPill from "@/components/StatPill.vue";
import { useContentStore } from "@/stores/content";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const contentStore = useContentStore();
const articles = computed(() =>
  [...contentStore.articles]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5),
);

onMounted(() => {
  void contentStore.loadAdminContent();
});
</script>

<template>
  <div>
    <p class="eyebrow">Dashboard</p>
    <h1 class="mt-2 font-display text-5xl">数据概览</h1>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <StatPill label="文章总数" :value="siteStore.stats.articles" />
      <StatPill label="总阅读量" :value="siteStore.stats.views" />
      <StatPill label="评论总数" :value="siteStore.stats.comments" />
    </div>

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
              {{ article.category.name }} · {{ article.status }}
            </p>
          </div>
          <p class="font-mono text-sm text-ink/55">
            {{ article.viewCount }} 阅读
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
