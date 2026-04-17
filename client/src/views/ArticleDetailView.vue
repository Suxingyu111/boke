<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getArticleBySlug } from "@/services/blog";
import { useAuthStore } from "@/stores/auth";
import { useContentStore } from "@/stores/content";
import { useEcosystemStore } from "@/stores/ecosystem";
import { renderMarkdown } from "@/utils/markdown";

const route = useRoute();
const contentStore = useContentStore();
const ecosystemStore = useEcosystemStore();
const authStore = useAuthStore();
const article = computed(() => getArticleBySlug(String(route.params.slug)));
const articleError = ref("");
const detailReady = ref(false);
const renderedContent = computed(() =>
  ecosystemStore.paidContent
    ? ecosystemStore.paidContent.contentHtml ||
      renderMarkdown(ecosystemStore.paidContent.content)
    : article.value
      ? article.value.contentHtml || renderMarkdown(article.value.content)
      : "",
);
const paidGateVisible = computed(() =>
  Boolean(
    ecosystemStore.paidContent?.isPaid && !ecosystemStore.paidContent.hasAccess,
  ),
);
const paidDescription = computed(
  () =>
    ecosystemStore.paidInfo?.description ||
    "这篇文章包含付费正文，解锁后可以继续阅读全文。",
);
const paidPrice = computed(
  () =>
    ecosystemStore.paidContent?.price ??
    ecosystemStore.paidInfo?.price ??
    undefined,
);

async function purchaseCurrentArticle() {
  if (!article.value) {
    return;
  }

  try {
    await ecosystemStore.purchaseArticle(article.value.id);
  } catch {
    articleError.value = ecosystemStore.errorMessage || "购买文章失败";
  }
}

watch(
  () => route.params.slug,
  async (slug) => {
    articleError.value = "";
    detailReady.value = false;

    try {
      const detail = await contentStore.loadPublicArticleDetail(String(slug));
      await ecosystemStore.loadPaidArticle(detail.id);
    } catch {
      articleError.value =
        contentStore.errorMessage ||
        ecosystemStore.errorMessage ||
        "文章详情加载失败";
    } finally {
      detailReady.value = true;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section
    v-if="contentStore.loading && !detailReady"
    class="content-shell py-20"
  >
    <div class="ui-surface animate-pulse p-6 md:p-8">
      <div class="h-4 w-20 rounded-md bg-line"></div>
      <div class="mt-6 h-12 w-3/4 rounded-md bg-line"></div>
      <div class="mt-4 h-4 w-1/2 rounded-md bg-line"></div>
      <div class="mt-8 h-80 rounded-md bg-line"></div>
    </div>
  </section>

  <article v-if="article" class="border-t border-line/50 bg-white/52">
    <header class="border-b border-line/70">
      <div
        class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end"
      >
        <div>
          <RouterLink
            class="focus-ring rounded-md text-sm font-semibold text-coral hover:text-brand"
            to="/"
          >
            返回首页
          </RouterLink>
          <h1
            class="mt-6 max-w-4xl font-display text-5xl leading-tight text-brand md:text-7xl"
          >
            {{ article.title }}
          </h1>
          <p class="mt-5 max-w-2xl text-lg text-ink/74">
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
            class="h-80 w-full rounded-[12px] object-cover"
            :alt="article.title"
            :src="article.coverImage"
            width="960"
            height="640"
          />
        </div>
      </div>
    </header>

    <div
      class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,760px)_260px]"
    >
      <div
        class="markdown-body ui-surface p-5 md:p-8"
        v-html="renderedContent"
      ></div>

      <div
        v-if="paidGateVisible"
        class="ui-surface grid gap-4 border-coral/30 p-5 md:p-6 lg:col-start-1"
      >
        <p class="text-sm font-semibold text-coral">付费内容</p>
        <h2 class="font-display text-3xl text-brand">继续阅读全文</h2>
        <p class="leading-7 text-ink/68">{{ paidDescription }}</p>
        <p v-if="paidPrice" class="font-semibold text-brand">
          解锁价格：¥{{ Number(paidPrice).toFixed(2) }}
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            v-if="authStore.isAuthenticated"
            class="focus-ring ui-button-primary px-5 py-3"
            :disabled="ecosystemStore.loading"
            type="button"
            @click="purchaseCurrentArticle"
          >
            创建购买记录
          </button>
          <RouterLink
            v-else
            class="focus-ring ui-button-primary px-5 py-3"
            :to="{ name: 'login', query: { redirect: route.fullPath } }"
          >
            登录后解锁
          </RouterLink>
        </div>
        <p v-if="ecosystemStore.notice" class="text-sm text-moss">
          {{ ecosystemStore.notice }}
        </p>
        <p v-if="ecosystemStore.errorMessage" class="text-sm text-coral">
          {{ ecosystemStore.errorMessage }}
        </p>
      </div>

      <aside class="ui-surface-soft h-fit p-5">
        <p class="font-display text-2xl text-brand">分类</p>
        <p
          class="mt-2 font-semibold"
          :style="{ color: article.category.color }"
        >
          {{ article.category.name }}
        </p>
        <p class="mt-6 font-display text-2xl text-brand">标签</p>
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
    <h1 class="font-display text-5xl text-brand">文章暂不可用</h1>
    <p class="mt-4 max-w-xl text-ink/65">
      {{
        articleError ||
        contentStore.errorMessage ||
        "这篇文章可能尚未发布，或请求已经失败。"
      }}
    </p>
    <RouterLink
      class="focus-ring ui-button-primary mt-6 inline-flex px-5 py-3"
      to="/"
    >
      回到首页
    </RouterLink>
  </section>
</template>
