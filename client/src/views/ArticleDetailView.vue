<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import * as contentApi from "@/api/content";
import CommentSection from "@/components/CommentSection.vue";
import { useAuthStore } from "@/stores/auth";
import { useContentStore } from "@/stores/content";
import { useEcosystemStore } from "@/stores/ecosystem";
import { useUserStore } from "@/stores/user";
import { handleMarkdownInteraction, renderStoredRichText } from "@/utils/markdown";

interface ArticleHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

const route = useRoute();
const contentStore = useContentStore();
const ecosystemStore = useEcosystemStore();
const authStore = useAuthStore();
const userStore = useUserStore();

const article = computed(() =>
  contentStore.publishedArticles.find(
    (item) => item.slug === String(route.params.slug),
  ),
);
const articleError = ref("");
const detailReady = ref(false);
const shareNotice = ref("");
const likeNotice = ref("");
const articleLiked = ref(false);
const likeLoading = ref(false);
const readingProgress = ref(0);
const processedContent = ref("");
const articleHeadings = ref<ArticleHeading[]>([]);
const articleBodyRef = ref<HTMLElement | null>(null);

const renderedContent = computed(() =>
  article.value
    ? renderStoredRichText(article.value.content, article.value.contentHtml)
    : "",
);

const relatedArticles = computed(() => {
  if (!article.value) {
    return [];
  }

  const currentTagIds = new Set(article.value.tags.map((tag) => tag.id));
  return contentStore.publishedArticles
    .filter((item) => item.id !== article.value?.id)
    .map((item) => {
      const sharedTagCount = item.tags.filter((tag) => currentTagIds.has(tag.id)).length;
      const sameCategory = item.category.id === article.value?.category.id ? 1 : 0;
      return {
        ...item,
        relevance: sharedTagCount * 10 + sameCategory * 4 + item.viewCount / 100,
      };
    })
    .filter((item) => item.relevance > 0)
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 4);
});

const popularArticles = computed(() => {
  if (!article.value) {
    return [];
  }

  return contentStore.publishedArticles
    .filter((item) => item.id !== article.value?.id)
    .slice()
    .sort((left, right) => right.viewCount - left.viewCount)
    .slice(0, 4);
});

const estimatedReadMinutes = computed(() => {
  const text = article.value?.content?.replace(/[#>*`\-\[\]()]/g, " ") || "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} 分钟阅读`;
});

function formatDate(value?: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildProcessedContent(value: string) {
  if (!value || typeof DOMParser === "undefined") {
    return { html: value, headings: [] as ArticleHeading[] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${value}</div>`, "text/html");
  const container = doc.body.firstElementChild as HTMLElement | null;
  const headings: ArticleHeading[] = [];

  container?.querySelectorAll("h2, h3").forEach((heading, index) => {
    const text = (heading.textContent || `段落 ${index + 1}`).trim();
    const id = heading.id || `section-${index + 1}`;
    heading.id = id;
    headings.push({
      id,
      text,
      level: heading.tagName === "H2" ? 2 : 3,
    });
  });

  return {
    html: container?.innerHTML ?? value,
    headings,
  };
}

function getArticleUrl() {
  if (!article.value || typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/articles/${article.value.slug}`;
}

function openShareWindow(url: string) {
  if (!url || typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer,width=720,height=640");
}

async function copyArticleLink() {
  const url = getArticleUrl();
  if (!url) {
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    shareNotice.value = "文章链接已复制，可以直接发给朋友或贴到微信里。";
  } catch {
    shareNotice.value = "复制失败，请手动复制浏览器地址栏链接。";
  }
}

async function shareNative() {
  const url = getArticleUrl();
  if (!article.value || !url) {
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: article.value.title,
        text: article.value.excerpt,
        url,
      });
      shareNotice.value = "已调起系统分享面板。";
      return;
    } catch {
      // 用户取消时不额外提示，继续保留其他分享入口。
    }
  }

  await copyArticleLink();
}

function shareToWeibo() {
  if (!article.value) {
    return;
  }

  const url = encodeURIComponent(getArticleUrl());
  const title = encodeURIComponent(article.value.title);
  openShareWindow(`https://service.weibo.com/share/share.php?title=${title}&url=${url}`);
}

function shareToX() {
  if (!article.value) {
    return;
  }

  const url = encodeURIComponent(getArticleUrl());
  const text = encodeURIComponent(`${article.value.title} ${article.value.excerpt}`);
  openShareWindow(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
}

function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateReadingProgress() {
  if (!articleBodyRef.value) {
    readingProgress.value = 0;
    return;
  }

  const rect = articleBodyRef.value.getBoundingClientRect();
  const viewportOffset = window.innerHeight * 0.24;
  const total = Math.max(articleBodyRef.value.offsetHeight - viewportOffset, 1);
  const passed = viewportOffset - rect.top;
  const ratio = Math.min(1, Math.max(0, passed / total));
  readingProgress.value = Math.round(ratio * 100);
}

async function toggleFavorite() {
  if (!article.value) {
    return;
  }

  await userStore.toggleFavorite(article.value.id);
}

async function loadLikeState(articleId: string) {
  try {
    const result = await contentApi.getArticleLikeState(articleId);
    articleLiked.value = result.liked;
    if (article.value) {
      article.value.likes = result.likes;
    }
  } catch {
    articleLiked.value = false;
  }
}

async function toggleLike() {
  if (!article.value || likeLoading.value) {
    return;
  }

  likeLoading.value = true;
  likeNotice.value = "";

  try {
    const result = articleLiked.value
      ? await contentApi.unlikeArticle(article.value.id)
      : await contentApi.likeArticle(article.value.id);
    articleLiked.value = result.liked;
    article.value.likes = result.likes;
    likeNotice.value = result.message;
  } catch (error) {
    likeNotice.value = getApiErrorMessage(
      error,
      articleLiked.value ? "取消点赞失败" : "点赞失败",
    );
  } finally {
    likeLoading.value = false;
  }
}

watch(
  () => renderedContent.value,
  async (value) => {
    const processed = buildProcessedContent(value);
    processedContent.value = processed.html;
    articleHeadings.value = processed.headings;
    await nextTick();
    updateReadingProgress();
  },
  { immediate: true },
);

watch(
  () => route.params.slug,
  async (slug) => {
    articleError.value = "";
    shareNotice.value = "";
    likeNotice.value = "";
    detailReady.value = false;
    articleLiked.value = false;

    try {
      const detailPromise = contentStore.loadPublicArticleDetail(String(slug));
      const listPromise =
        contentStore.publishedArticles.length > 1
          ? Promise.resolve()
          : contentStore.loadPublicContent().catch(() => undefined);
      const [detail] = await Promise.all([detailPromise, listPromise]);

      await loadLikeState(detail.id);
      if (authStore.isAuthenticated) {
        await userStore.checkFavorite(detail.id);
      }
    } catch {
      articleError.value =
        contentStore.errorMessage ||
        ecosystemStore.errorMessage ||
        "文章详情加载失败";
    } finally {
      detailReady.value = true;
      await nextTick();
      updateReadingProgress();
    }
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("scroll", updateReadingProgress, { passive: true });
  window.addEventListener("resize", updateReadingProgress);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateReadingProgress);
  window.removeEventListener("resize", updateReadingProgress);
});
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

  <article v-else-if="article" class="border-t border-line/50 bg-white/52">
    <div class="article-progress" :style="{ width: `${readingProgress}%` }"></div>

    <header class="border-b border-line/70">
      <div
        class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end"
      >
        <div>
          <nav class="flex flex-wrap items-center gap-1.5 text-sm text-ink/50">
            <RouterLink class="focus-ring hover:text-brand" to="/">首页</RouterLink>
            <span class="text-ink/30">/</span>
            <RouterLink
              class="focus-ring hover:text-brand"
              :to="`/categories/${article.category.slug}`"
            >{{ article.category.name }}</RouterLink>
            <span class="text-ink/30">/</span>
            <span class="line-clamp-1 max-w-[200px] text-ink/75">{{ article.title }}</span>
          </nav>
          <h1
            class="mt-5 max-w-3xl font-display text-[2.25rem] leading-[1.12] text-brand md:text-5xl lg:text-[3.5rem]"
          >
            {{ article.title }}
          </h1>
          <p class="mt-4 max-w-2xl text-[1.1rem] leading-[1.8] text-ink/68">
            {{ article.excerpt }}
          </p>
          <div class="mt-5 flex flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink/75">
              <span class="font-semibold">{{ article.author.nickname }}</span>
              <span class="text-ink/35">·</span>
              <span>{{ formatDate(article.publishedAt) }}</span>
              <span class="text-ink/35">·</span>
              <span>{{ estimatedReadMinutes }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 text-xs text-ink/45">
              <span>{{ article.viewCount }} 次阅读</span>
              <span class="text-ink/25">|</span>
              <span>{{ article.likes }} 喜欢</span>
              <span class="text-ink/25">|</span>
              <span>{{ article.commentCount }} 评论</span>
            </div>
          </div>
          <div class="article-share mt-6">
            <button
              class="focus-ring ui-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              type="button"
              @click="shareNative"
            >
              <span aria-hidden="true">↑</span> 分享文章
            </button>
            <button
              class="focus-ring ui-button-secondary px-3 py-2 text-sm"
              type="button"
              @click="shareToWeibo"
            >
              微博
            </button>
            <button
              class="focus-ring ui-button-secondary px-3 py-2 text-sm"
              type="button"
              @click="shareToX"
            >
              X
            </button>
            <button
              class="focus-ring ui-button-secondary px-3 py-2 text-sm"
              type="button"
              @click="copyArticleLink"
            >
              复制链接
            </button>
          </div>
          <p v-if="shareNotice" class="mt-3 text-sm text-moss">{{ shareNotice }}</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <button
              class="focus-ring ui-button-secondary px-5 py-3"
              :class="articleLiked && 'border-brand text-brand'"
              :disabled="likeLoading"
              type="button"
              @click="toggleLike"
            >
              {{ likeLoading ? "处理中..." : articleLiked ? "已点赞" : "点赞文章" }}
            </button>
            <button
              v-if="authStore.isAuthenticated"
              class="focus-ring ui-button-primary px-5 py-3"
              type="button"
              @click="toggleFavorite"
            >
              {{ userStore.favoriteState[article.id] ? "取消收藏" : "收藏文章" }}
            </button>
            <RouterLink
              v-else
              class="focus-ring ui-button-secondary px-5 py-3"
              :to="{ name: 'login', query: { redirect: route.fullPath } }"
            >
              登录后收藏
            </RouterLink>
            <p v-if="userStore.notice" class="self-center text-sm text-moss">
              {{ userStore.notice }}
            </p>
            <p v-if="likeNotice" class="self-center text-sm text-moss">
              {{ likeNotice }}
            </p>
          </div>
        </div>

        <div class="ui-surface overflow-hidden p-2">
          <img
            class="h-80 w-full rounded-md object-cover"
            :alt="article.title"
            :src="article.coverImage"
            width="960"
            height="640"
            loading="lazy"
          />
        </div>
      </div>
    </header>

    <div
      class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,760px)_300px]"
    >
      <div class="grid gap-6">
        <details
          v-if="articleHeadings.length"
          class="lg:hidden ui-surface-soft p-4"
        >
          <summary class="cursor-pointer select-none text-sm font-semibold text-brand">
            目录（{{ articleHeadings.length }} 节）
          </summary>
          <div class="mt-3 grid gap-0.5 border-l-2 border-line pl-3">
            <button
              v-for="heading in articleHeadings"
              :key="heading.id"
              class="focus-ring text-left text-sm leading-relaxed text-ink/68 hover:text-brand"
              :class="{ 'pl-3 text-xs text-ink/52': heading.level === 3 }"
              type="button"
              @click="scrollToHeading(heading.id)"
            >
              {{ heading.text }}
            </button>
          </div>
        </details>
        <div
          ref="articleBodyRef"
          class="markdown-body ui-surface p-6 md:p-10 lg:p-12"
          @click="handleMarkdownInteraction"
          v-html="processedContent"
        ></div>

        <section v-if="relatedArticles.length" class="ui-surface p-5 md:p-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="eyebrow">Related</p>
              <h2 class="mt-2 font-display text-3xl text-brand">相关文章</h2>
            </div>
            <RouterLink class="focus-ring text-sm font-semibold text-coral" to="/archives">
              去看更多归档
            </RouterLink>
          </div>
          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <RouterLink
              v-for="item in relatedArticles"
              :key="item.id"
              class="focus-ring rounded-md border border-line bg-paper p-4 hover:border-brand hover:bg-white"
              :to="`/articles/${item.slug}`"
            >
              <p class="text-xs text-ink/48">
                {{ item.category.name }} / {{ item.viewCount }} 阅读
              </p>
              <h3 class="mt-1.5 font-display text-xl leading-snug text-brand line-clamp-2">
                {{ item.title }}
              </h3>
              <p class="mt-2 line-clamp-3 text-sm leading-7 text-ink/64">
                {{ item.excerpt }}
              </p>
            </RouterLink>
          </div>
        </section>

        <CommentSection
          :allow-comment="article.allowComment"
          :article-id="article.id"
          :article-title="article.title"
        />
      </div>

      <aside class="grid gap-5">
        <section v-if="articleHeadings.length" class="ui-surface-soft h-fit p-5 article-toc">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="h-5 w-0.5 shrink-0 rounded-full bg-coral"></span>
            <p class="font-display text-xl text-brand">文章目录</p>
          </div>
          <div class="grid gap-0.5">
            <button
              v-for="heading in articleHeadings"
              :key="heading.id"
              class="focus-ring article-toc__item"
              :class="{ 'article-toc__item--sub': heading.level === 3 }"
              type="button"
              @click="scrollToHeading(heading.id)"
            >
              {{ heading.text }}
            </button>
          </div>
        </section>

        <section class="ui-surface-soft h-fit p-5">
          <div class="mb-3 flex items-center gap-2.5">
            <span class="h-5 w-0.5 shrink-0 rounded-full bg-coral"></span>
            <p class="font-display text-xl text-brand">分类与标签</p>
          </div>
          <p
            class="mt-1 font-semibold"
            :style="{ color: article.category.color }"
          >
            {{ article.category.name }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <RouterLink
              v-for="tag in article.tags"
              :key="tag.id"
              class="focus-ring inline-flex items-center rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-semibold text-ink/65 hover:border-coral/50 hover:bg-coral/8 hover:text-coral"
              :to="`/tags?tag=${tag.slug}`"
            >
              #{{ tag.name }}
            </RouterLink>
          </div>
        </section>

        <section v-if="popularArticles.length" class="ui-surface-soft h-fit p-5">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="h-5 w-0.5 shrink-0 rounded-full bg-coral"></span>
            <p class="font-display text-xl text-brand">热门文章</p>
          </div>
          <div class="grid gap-3">
            <RouterLink
              v-for="item in popularArticles"
              :key="item.id"
              class="focus-ring rounded-md border border-line bg-white px-4 py-3 hover:border-brand hover:bg-white"
              :to="`/articles/${item.slug}`"
            >
              <p class="font-semibold text-brand">{{ item.title }}</p>
              <p class="mt-1 text-xs text-ink/48">
                {{ item.viewCount }} 阅读 / {{ formatDate(item.publishedAt) }}
              </p>
            </RouterLink>
          </div>
        </section>
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
