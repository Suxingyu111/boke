<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getArticleBySlug } from "@/services/blog";
import { useContentStore } from "@/stores/content";
import { renderMarkdown } from "@/utils/markdown";

const route = useRoute();
const contentStore = useContentStore();
const article = computed(() => getArticleBySlug(String(route.params.slug)));
const articleError = ref("");
const detailReady = ref(false);
const renderedContent = computed(() =>
  article.value
    ? article.value.contentHtml || renderMarkdown(article.value.content)
    : "",
);

watch(
  () => route.params.slug,
  async (slug) => {
    articleError.value = "";
    detailReady.value = false;

    try {
      await contentStore.loadPublicArticleDetail(String(slug));
    } catch {
      articleError.value = contentStore.errorMessage || "文章详情加载失败";
    } finally {
      detailReady.value = true;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section v-if="contentStore.loading && !detailReady" class="content-shell py-20">
    <div class="ui-surface animate-pulse p-6 md:p-8">
      <div class="h-4 w-20 rounded-md bg-line"></div>
      <div class="mt-6 h-12 w-3/4 rounded-md bg-line"></div>
      <div class="mt-4 h-4 w-1/2 rounded-md bg-line"></div>
      <div class="mt-8 h-80 rounded-md bg-line"></div>
    </div>
  </section>

  <article v-if="article" class="bg-white/80">
    <header class="border-b border-line/80">
      <div
        class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end"
      >
        <div>
          <RouterLink
            class="focus-ring rounded-md text-sm font-medium text-coral hover:text-moss"
            to="/"
            >返回首页</RouterLink
          >
          <h1
            class="mt-6 max-w-4xl font-display text-5xl leading-tight md:text-7xl"
          >
            {{ article.title }}
          </h1>
          <p class="mt-5 max-w-2xl text-lg text-ink/70">
            {{ article.excerpt }}
          </p>
          <div class="mt-6 flex flex-wrap gap-3 text-sm text-ink/60">
            <span>{{ article.author.nickname }}</span>
            <span>{{
              new Date(article.publishedAt).toLocaleDateString("zh-CN")
            }}</span>
            <span>{{ article.viewCount }} 阅读</span>
            <span>{{ article.likes }} 喜欢</span>
          </div>
        </div>

        <div class="ui-surface overflow-hidden p-2">
          <img
            class="h-80 w-full rounded-md object-cover"
            :alt="article.title"
            :src="article.coverImage"
          />
        </div>
      </div>
    </header>

    <div
      class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,760px)_240px]"
    >
      <div
        class="markdown-body ui-surface bg-white p-5 md:p-8"
        v-html="renderedContent"
      ></div>

      <aside class="ui-surface-soft h-fit p-5">
        <p class="font-display text-2xl">分类</p>
        <p class="mt-2" :style="{ color: article.category.color }">
          {{ article.category.name }}
        </p>
        <p class="mt-6 font-display text-2xl">标签</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <RouterLink
            v-for="tag in article.tags"
            :key="tag.id"
            class="focus-ring min-h-9 rounded-md bg-white px-2 py-1 text-sm hover:text-coral"
            :to="`/tags?tag=${tag.slug}`"
          >
            #{{ tag.name }}
          </RouterLink>
        </div>
      </aside>
    </div>
  </article>

  <section v-else class="content-shell py-20">
    <h1 class="font-display text-5xl">文章暂不可用</h1>
    <p class="mt-4 max-w-xl text-ink/65">
      {{ articleError || contentStore.errorMessage || "这篇文章可能尚未发布，或请求已经失败。" }}
    </p>
    <RouterLink
      class="focus-ring mt-6 inline-block rounded-md bg-ink px-4 py-2 text-paper"
      to="/"
    >
      回到首页
    </RouterLink>
  </section>
</template>
