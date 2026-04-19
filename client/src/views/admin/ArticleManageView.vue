<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { getApiErrorMessage } from "@/api/auth";
import { useContentStore, type ArticleMutationPayload } from "@/stores/content";
import type { Article, ArticleStatus, Category, Tag } from "@/types/blog";
import { handleMarkdownInteraction, renderMarkdown } from "@/utils/markdown";

type PanelKey = "articles" | "categories" | "tags";
type StatusFilter = ArticleStatus | "all";
type PublishIntent = "draft" | "publish" | "schedule";

interface ArticleForm {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  tagIds: string[];
  scheduledAt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

const defaultCover =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80";
const pageSize = 5;
const contentStore = useContentStore();

const panels: { key: PanelKey; label: string }[] = [
  { key: "articles", label: "文章" },
  { key: "categories", label: "分类" },
  { key: "tags", label: "标签" },
];
const activePanel = ref<PanelKey>("articles");
const articleSearch = ref("");
const statusFilter = ref<StatusFilter>("all");
const articlePage = ref(1);
const notice = ref("");
const articleError = ref("");
const categoryError = ref("");
const tagError = ref("");

const articleForm = reactive<ArticleForm>(createArticleForm());
const categoryForm = reactive({
  id: "",
  name: "",
  slug: "",
  description: "",
  color: "#185c52",
});
const tagForm = reactive({
  id: "",
  name: "",
  slug: "",
});

const statusText: Record<ArticleStatus, string> = {
  draft: "草稿",
  scheduled: "定时",
  published: "已发布",
  archived: "回收站",
};

const sortedArticles = computed(() =>
  [...contentStore.articles].sort((a, b) => {
    const aDate = a.publishedAt || a.scheduledAt || a.updatedAt || a.createdAt;
    const bDate = b.publishedAt || b.scheduledAt || b.updatedAt || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  }),
);

const filteredArticles = computed(() => {
  const keyword = articleSearch.value.trim().toLowerCase();

  return sortedArticles.value.filter((article) => {
    const matchesStatus =
      statusFilter.value === "all" || article.status === statusFilter.value;
    const matchesKeyword =
      !keyword ||
      `${article.title} ${article.excerpt} ${article.content}`
        .toLowerCase()
        .includes(keyword);
    return matchesStatus && matchesKeyword;
  });
});

const totalArticlePages = computed(() =>
  Math.max(1, Math.ceil(filteredArticles.value.length / pageSize)),
);

const pagedArticles = computed(() => {
  const start = (articlePage.value - 1) * pageSize;
  return filteredArticles.value.slice(start, start + pageSize);
});

const renderedPreview = computed(() =>
  renderMarkdown(
    articleForm.content || "开始写作后，这里会同步显示 Markdown 预览。",
  ),
);

const articleStats = computed(() => ({
  published: contentStore.articles.filter(
    (article) => article.status === "published",
  ).length,
  drafts: contentStore.articles.filter((article) => article.status === "draft")
    .length,
  scheduled: contentStore.articles.filter(
    (article) => article.status === "scheduled",
  ).length,
  archived: contentStore.articles.filter(
    (article) => article.status === "archived",
  ).length,
}));

watch([filteredArticles, statusFilter, articleSearch], () => {
  if (articlePage.value > totalArticlePages.value) {
    articlePage.value = totalArticlePages.value;
  }
});

watch(
  () => contentStore.categories.length,
  () => {
    if (!articleForm.categoryId) {
      articleForm.categoryId = contentStore.categories[0]?.id ?? "";
    }
  },
);

onMounted(() => {
  void loadAdminContent();
});

async function loadAdminContent() {
  try {
    await contentStore.loadAdminContent();
  } catch (error) {
    articleError.value = getApiErrorMessage(error, "内容管理接口加载失败");
  }
}

function createArticleForm(): ArticleForm {
  return {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    content:
      "# 新文章标题\n\n写下第一段。支持 **加粗**、`代码`、列表和引用。\n\n- 一个清晰观点\n- 一个可执行结论",
    coverImage: defaultCover,
    categoryId: contentStore.categories[0]?.id ?? "",
    tagIds: [],
    scheduledAt: toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
  };
}

function toLocalInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoString(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value?: string) {
  if (!value) {
    return "未设置";
  }

  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resetArticleForm() {
  Object.assign(articleForm, createArticleForm());
  articleError.value = "";
  notice.value = "";
}

function buildArticlePayload(
  intent: PublishIntent,
): ArticleMutationPayload | null {
  articleError.value = "";
  const title = articleForm.title.trim();
  const content = articleForm.content.trim();
  const excerpt = articleForm.excerpt.trim();

  if (!title) {
    articleError.value = "先给文章一个标题。";
    return null;
  }

  if (!content) {
    articleError.value = "正文不能为空。";
    return null;
  }

  if (!articleForm.categoryId) {
    articleError.value = "请选择一个分类。";
    return null;
  }

  const status: ArticleStatus =
    intent === "publish"
      ? "published"
      : intent === "schedule"
        ? "scheduled"
        : "draft";
  const scheduledAt =
    status === "scheduled" ? toIsoString(articleForm.scheduledAt) : undefined;

  if (
    status === "scheduled" &&
    scheduledAt &&
    new Date(scheduledAt).getTime() <= Date.now()
  ) {
    articleError.value = "定时发布时间需要晚于当前时间。";
    return null;
  }

  return {
    id: articleForm.id || undefined,
    title,
    slug: articleForm.slug.trim(),
    excerpt: excerpt || content.replace(/[#>*`-]/g, "").slice(0, 120),
    content,
    coverImage: articleForm.coverImage.trim() || defaultCover,
    categoryId: articleForm.categoryId,
    tagIds: articleForm.tagIds,
    status,
    publishedAt: status === "published" ? new Date().toISOString() : undefined,
    scheduledAt,
    seoTitle: articleForm.seoTitle.trim(),
    seoDescription: articleForm.seoDescription.trim(),
    seoKeywords: articleForm.seoKeywords.trim(),
  };
}

async function saveArticle(intent: PublishIntent) {
  const payload = buildArticlePayload(intent);
  if (!payload) {
    return;
  }

  try {
    const savedArticle = payload.id
      ? await contentStore.updateArticle(payload)
      : await contentStore.createArticle(payload);
    const actionText =
      intent === "publish"
        ? "已发布"
        : intent === "schedule"
          ? "已加入定时发布"
          : "草稿已保存";

    notice.value = `${actionText}：${savedArticle.title}`;
    Object.assign(articleForm, {
      ...articleForm,
      id: savedArticle.id,
    });
  } catch (error) {
    articleError.value = getApiErrorMessage(error, "文章保存失败");
  }
}

async function editArticle(article: Article) {
  activePanel.value = "articles";
  notice.value = "";
  articleError.value = "";
  let detail = article;
  try {
    detail = await contentStore.loadAdminArticleDetail(article.id);
  } catch (error) {
    articleError.value = getApiErrorMessage(error, "文章详情加载失败");
  }

  Object.assign(articleForm, {
    id: detail.id,
    title: detail.title,
    slug: detail.slug,
    excerpt: detail.excerpt,
    content: detail.content,
    coverImage: detail.coverImage,
    categoryId: detail.category.id,
    tagIds: detail.tags.map((tag) => tag.id),
    scheduledAt: detail.scheduledAt
      ? toLocalInputValue(detail.scheduledAt)
      : toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
    seoTitle: detail.seoTitle ?? "",
    seoDescription: detail.seoDescription ?? "",
    seoKeywords: detail.seoKeywords ?? "",
  });
}

async function archiveArticle(article: Article) {
  if (confirm(`确认删除《${article.title}》？可在回收站恢复为草稿。`)) {
    try {
      await contentStore.archiveArticle(article.id);
      notice.value = `已移入回收站：${article.title}`;
    } catch (error) {
      articleError.value = getApiErrorMessage(error, "文章删除失败");
    }
  }
}

async function restoreDraft(article: Article) {
  try {
    await contentStore.restoreArticleDraft(article.id);
    notice.value = `已恢复为草稿：${article.title}`;
  } catch (error) {
    articleError.value = getApiErrorMessage(error, "恢复草稿失败");
  }
}

async function deletePermanently(article: Article) {
  if (confirm(`永久删除《${article.title}》？此操作不能撤销。`)) {
    try {
      await contentStore.deleteArticlePermanently(article.id);
      notice.value = `已永久删除：${article.title}`;
      if (articleForm.id === article.id) {
        resetArticleForm();
      }
    } catch (error) {
      articleError.value = getApiErrorMessage(error, "永久删除失败");
    }
  }
}

function statusClass(status: ArticleStatus) {
  if (status === "published") {
    return "border-moss text-moss";
  }
  if (status === "scheduled") {
    return "border-cobalt text-cobalt";
  }
  if (status === "archived") {
    return "border-ink/30 text-ink/45";
  }
  return "border-coral text-coral";
}

async function editCategory(category: Category) {
  activePanel.value = "categories";
  categoryError.value = "";
  try {
    Object.assign(
      categoryForm,
      await contentStore.loadAdminCategoryDetail(category.id),
    );
  } catch (error) {
    categoryError.value = getApiErrorMessage(error, "分类详情加载失败");
    Object.assign(categoryForm, category);
  }
}

function resetCategoryForm() {
  Object.assign(categoryForm, {
    id: "",
    name: "",
    slug: "",
    description: "",
    color: "#185c52",
  });
  categoryError.value = "";
}

async function submitCategory() {
  categoryError.value = "";
  if (!categoryForm.name.trim()) {
    categoryError.value = "分类名称不能为空。";
    return;
  }

  try {
    const savedCategory = await contentStore.saveCategory({
      id: categoryForm.id || undefined,
      name: categoryForm.name.trim(),
      slug: categoryForm.slug.trim() || undefined,
      description: categoryForm.description.trim(),
      color: categoryForm.color,
    });
    notice.value = `分类已保存：${savedCategory.name}`;
    resetCategoryForm();
  } catch (error) {
    categoryError.value = getApiErrorMessage(error, "分类保存失败");
  }
}

async function removeCategory(category: Category) {
  try {
    await contentStore.deleteCategory(category.id);
    notice.value = `分类已删除：${category.name}`;
  } catch (error) {
    categoryError.value = getApiErrorMessage(
      error,
      "该分类仍有关联文章，无法删除",
    );
  }
}

async function editTag(tag: Tag) {
  activePanel.value = "tags";
  tagError.value = "";
  try {
    Object.assign(tagForm, await contentStore.loadAdminTagDetail(tag.id));
  } catch (error) {
    tagError.value = getApiErrorMessage(error, "标签详情加载失败");
    Object.assign(tagForm, tag);
  }
}

function resetTagForm() {
  Object.assign(tagForm, {
    id: "",
    name: "",
    slug: "",
  });
  tagError.value = "";
}

async function submitTag() {
  tagError.value = "";
  if (!tagForm.name.trim()) {
    tagError.value = "标签名称不能为空。";
    return;
  }

  try {
    const savedTag = await contentStore.saveTag({
      id: tagForm.id || undefined,
      name: tagForm.name.trim(),
      slug: tagForm.slug.trim() || undefined,
    });
    notice.value = `标签已保存：${savedTag.name}`;
    resetTagForm();
  } catch (error) {
    tagError.value = getApiErrorMessage(error, "标签保存失败");
  }
}

async function removeTag(tag: Tag) {
  if (confirm(`删除标签 #${tag.name}？它会从已关联文章中移除。`)) {
    try {
      await contentStore.deleteTag(tag.id);
      notice.value = `标签已删除：${tag.name}`;
    } catch (error) {
      tagError.value = getApiErrorMessage(error, "标签删除失败");
    }
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Editorial Desk</p>
        <h1 class="mt-2 font-display text-5xl text-brand">文章管理</h1>
        <p class="mt-3 max-w-2xl text-ink/65">
          发布、草稿、定时、分类与标签都在这里收束。
        </p>
      </div>
      <button
        class="focus-ring ui-button-primary px-5 py-3"
        type="button"
        @click="resetArticleForm"
      >
        新建文章
      </button>
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <button
        v-for="panel in panels"
        :key="panel.key"
        class="focus-ring min-h-11 rounded-md border px-4 py-2 text-sm font-medium"
        :class="
          activePanel === panel.key
            ? 'border-ink bg-ink text-paper shadow-lifted'
            : 'border-line bg-white text-ink/70 hover:border-brand hover:text-brand hover:shadow-insetline'
        "
        type="button"
        @click="activePanel = panel.key"
      >
        {{ panel.label }}
      </button>
    </div>

    <p
      v-if="notice"
      class="mt-5 rounded-md border border-moss bg-white px-4 py-3 text-sm font-medium text-moss shadow-insetline"
    >
      {{ notice }}
    </p>

    <section
      v-if="activePanel === 'articles'"
      class="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]"
    >
      <form class="ui-surface grid gap-5 p-6" @submit.prevent>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="text-sm text-ink/60">标题</span>
            <input
              v-model="articleForm.title"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              placeholder="写一个有钩子的标题"
              type="text"
            />
          </label>
          <label class="block">
            <span class="text-sm text-ink/60">URL 别名</span>
            <input
              v-model="articleForm.slug"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              placeholder="留空按标题生成"
              type="text"
            />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="text-sm text-ink/60">封面图 URL</span>
            <input
              v-model="articleForm.coverImage"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              placeholder="https://..."
              type="url"
            />
          </label>
          <label class="block">
            <span class="text-sm text-ink/60">SEO 标题</span>
            <input
              v-model="articleForm.seoTitle"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              placeholder="留空使用文章标题"
              type="text"
            />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="text-sm text-ink/60">摘要</span>
            <textarea
              v-model="articleForm.excerpt"
              class="focus-ring mt-2 min-h-24 w-full resize-y rounded-md border border-line px-3 py-2"
              placeholder="用于列表页和详情页头部"
            ></textarea>
          </label>
          <label class="block">
            <span class="text-sm text-ink/60">SEO 描述</span>
            <textarea
              v-model="articleForm.seoDescription"
              class="focus-ring mt-2 min-h-24 w-full resize-y rounded-md border border-line px-3 py-2"
              placeholder="留空使用摘要"
            ></textarea>
          </label>
        </div>

        <label class="block">
          <span class="text-sm text-ink/60">SEO 关键词</span>
          <input
            v-model="articleForm.seoKeywords"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
            placeholder="用英文逗号或中文逗号分隔"
            type="text"
          />
        </label>

        <div class="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <label class="block">
            <span class="text-sm text-ink/60">分类</span>
            <select
              v-model="articleForm.categoryId"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
            >
              <option
                v-for="category in contentStore.categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </label>
          <div>
            <span class="text-sm text-ink/60">标签</span>
            <div class="mt-2 flex flex-wrap gap-2">
              <label
                v-for="tag in contentStore.tags"
                :key="tag.id"
                class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm hover:border-coral hover:bg-white"
              >
                <input
                  v-model="articleForm.tagIds"
                  class="accent-brand"
                  type="checkbox"
                  :value="tag.id"
                />
                #{{ tag.name }}
              </label>
            </div>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <label class="block">
            <span class="text-sm text-ink/60">Markdown 正文</span>
            <textarea
              v-model="articleForm.content"
              class="focus-ring mt-2 min-h-[360px] w-full resize-y rounded-md border border-line bg-paper px-4 py-3 font-mono text-sm leading-7"
            ></textarea>
          </label>
          <div>
            <p class="text-sm text-ink/60">实时预览</p>
            <div
              class="markdown-body mt-2 min-h-[360px] overflow-auto rounded-md border border-line bg-paper p-4 shadow-insetline"
              @click="handleMarkdownInteraction"
              v-html="renderedPreview"
            ></div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label class="block">
            <span class="text-sm text-ink/60">定时发布时间</span>
            <input
              v-model="articleForm.scheduledAt"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              type="datetime-local"
            />
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              class="focus-ring min-h-11 rounded-md border border-coral bg-white px-4 py-2 text-coral hover:bg-coral hover:text-paper"
              type="button"
              @click="saveArticle('draft')"
            >
              保存草稿
            </button>
            <button
              class="focus-ring ui-button-primary px-4 py-2"
              type="button"
              @click="saveArticle('publish')"
            >
              立即发布
            </button>
            <button
              class="focus-ring min-h-11 rounded-md bg-cobalt px-4 py-2 text-paper shadow-lifted hover:bg-ink hover:-translate-y-0.5"
              type="button"
              @click="saveArticle('schedule')"
            >
              定时发布
            </button>
          </div>
        </div>

        <p v-if="articleError" class="text-sm text-coral">{{ articleError }}</p>
      </form>

      <div class="grid gap-5">
        <div class="grid gap-3 sm:grid-cols-4">
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">已发布</p>
            <p class="mt-2 font-display text-3xl">
              {{ articleStats.published }}
            </p>
          </div>
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">草稿</p>
            <p class="mt-2 font-display text-3xl">{{ articleStats.drafts }}</p>
          </div>
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">定时</p>
            <p class="mt-2 font-display text-3xl">
              {{ articleStats.scheduled }}
            </p>
          </div>
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">回收站</p>
            <p class="mt-2 font-display text-3xl">
              {{ articleStats.archived }}
            </p>
          </div>
        </div>

        <div class="ui-surface-soft grid gap-3 p-4 md:grid-cols-[1fr_180px]">
          <label>
            <span class="text-sm text-ink/60">搜索文章</span>
            <input
              v-model="articleSearch"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              placeholder="标题、摘要或正文"
              type="search"
            />
          </label>
          <label>
            <span class="text-sm text-ink/60">状态</span>
            <select
              v-model="statusFilter"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
            >
              <option value="all">全部</option>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
              <option value="scheduled">定时</option>
              <option value="archived">回收站</option>
            </select>
          </label>
        </div>

        <div class="ui-surface overflow-x-auto rounded-[16px]">
          <table class="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead class="bg-wash/80 text-ink/66">
              <tr>
                <th class="p-4 font-medium">标题</th>
                <th class="p-4 font-medium">分类/标签</th>
                <th class="p-4 font-medium">状态</th>
                <th class="p-4 font-medium">阅读</th>
                <th class="p-4 font-medium">时间</th>
                <th class="p-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="article in pagedArticles"
                :key="article.id"
                class="transition-colors duration-200 hover:bg-white/90"
              >
                <td class="p-4">
                  <p class="font-semibold">{{ article.title }}</p>
                  <p class="mt-1 line-clamp-2 text-ink/55">
                    {{ article.excerpt }}
                  </p>
                </td>
                <td class="p-4">
                  <p :style="{ color: article.category.color }">
                    {{ article.category.name }}
                  </p>
                  <div class="mt-2 flex flex-wrap gap-1">
                    <span
                      v-for="tag in article.tags"
                      :key="tag.id"
                      class="rounded-md bg-paper px-2 py-1 text-xs"
                    >
                      #{{ tag.name }}
                    </span>
                  </div>
                </td>
                <td class="p-4">
                  <span
                    class="rounded-md border px-2 py-1 text-xs"
                    :class="statusClass(article.status)"
                  >
                    {{ statusText[article.status] }}
                  </span>
                </td>
                <td class="p-4">{{ article.viewCount }}</td>
                <td class="p-4">
                  <span v-if="article.status === 'scheduled'">
                    {{ formatDate(article.scheduledAt) }}
                  </span>
                  <span v-else-if="article.status === 'published'">
                    {{ formatDate(article.publishedAt) }}
                  </span>
                  <span v-else>{{ formatDate(article.updatedAt) }}</span>
                </td>
                <td class="p-4">
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="focus-ring min-h-9 rounded-md border border-line px-2 py-1 hover:border-moss hover:text-moss"
                      type="button"
                      @click="editArticle(article)"
                    >
                      编辑
                    </button>
                    <button
                      v-if="article.status !== 'archived'"
                      class="focus-ring min-h-9 rounded-md border border-line px-2 py-1 hover:border-brand hover:text-brand"
                      type="button"
                      @click="archiveArticle(article)"
                    >
                      删除
                    </button>
                    <button
                      v-if="article.status === 'archived'"
                      class="focus-ring min-h-9 rounded-md border border-line px-2 py-1 hover:border-moss hover:text-moss"
                      type="button"
                      @click="restoreDraft(article)"
                    >
                      恢复草稿
                    </button>
                    <button
                      v-if="article.status === 'archived'"
                      class="focus-ring min-h-9 rounded-md border border-coral px-2 py-1 text-coral hover:bg-coral hover:text-paper"
                      type="button"
                      @click="deletePermanently(article)"
                    >
                      永久删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-ink/55">
            共 {{ filteredArticles.length }} 篇，第 {{ articlePage }} /
            {{ totalArticlePages }} 页
          </p>
          <div class="flex gap-2">
            <button
              class="focus-ring ui-button-secondary px-3 py-2 text-sm disabled:opacity-50"
              :disabled="articlePage === 1"
              type="button"
              @click="articlePage -= 1"
            >
              上一页
            </button>
            <button
              class="focus-ring ui-button-primary px-3 py-2 text-sm disabled:opacity-50"
              :disabled="articlePage === totalArticlePages"
              type="button"
              @click="articlePage += 1"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </section>

    <section
      v-else-if="activePanel === 'categories'"
      class="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"
    >
      <form
        class="ui-surface grid h-fit gap-5 p-6"
        @submit.prevent="submitCategory"
      >
        <h2 class="font-display text-3xl">
          {{ categoryForm.id ? "编辑分类" : "新建分类" }}
        </h2>
        <label>
          <span class="text-sm text-ink/60">名称</span>
          <input
            v-model="categoryForm.name"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
            type="text"
          />
        </label>
        <label>
          <span class="text-sm text-ink/60">Slug</span>
          <input
            v-model="categoryForm.slug"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
            placeholder="留空自动生成"
            type="text"
          />
        </label>
        <label>
          <span class="text-sm text-ink/60">描述</span>
          <textarea
            v-model="categoryForm.description"
            class="focus-ring mt-2 min-h-24 w-full rounded-md border border-line px-3 py-2"
          ></textarea>
        </label>
        <label>
          <span class="text-sm text-ink/60">颜色</span>
          <input
            v-model="categoryForm.color"
            class="focus-ring mt-2 h-11 w-full rounded-md border border-line px-2 py-1"
            type="color"
          />
        </label>
        <p v-if="categoryError" class="text-sm text-coral">
          {{ categoryError }}
        </p>
        <div class="flex gap-2">
          <button class="focus-ring ui-button-primary px-4 py-2" type="submit">
            保存分类
          </button>
          <button
            class="focus-ring ui-button-secondary px-4 py-2"
            type="button"
            @click="resetCategoryForm"
          >
            清空
          </button>
        </div>
      </form>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="category in contentStore.categories"
          :key="category.id"
          class="ui-surface ui-hover-lift p-6"
        >
          <div
            class="h-1 w-16"
            :style="{ backgroundColor: category.color }"
          ></div>
          <h3 class="mt-4 font-display text-3xl">{{ category.name }}</h3>
          <p class="mt-2 text-sm text-ink/55">/{{ category.slug }}</p>
          <p class="mt-3 leading-7 text-ink/65">{{ category.description }}</p>
          <p class="mt-4 text-sm text-ink/55">
            {{ category.articleCount }} 篇文章
          </p>
          <div class="mt-5 flex gap-2">
            <button
              class="focus-ring rounded-md border border-line px-3 py-2 text-sm hover:border-moss hover:text-moss"
              type="button"
              @click="editCategory(category)"
            >
              编辑
            </button>
            <button
              class="focus-ring rounded-md border border-coral px-3 py-2 text-sm text-coral"
              type="button"
              @click="removeCategory(category)"
            >
              删除
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form class="ui-surface grid h-fit gap-5 p-6" @submit.prevent="submitTag">
        <h2 class="font-display text-3xl">
          {{ tagForm.id ? "编辑标签" : "新建标签" }}
        </h2>
        <label>
          <span class="text-sm text-ink/60">名称</span>
          <input
            v-model="tagForm.name"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
            type="text"
          />
        </label>
        <label>
          <span class="text-sm text-ink/60">Slug</span>
          <input
            v-model="tagForm.slug"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
            placeholder="留空自动生成"
            type="text"
          />
        </label>
        <p v-if="tagError" class="text-sm text-coral">{{ tagError }}</p>
        <div class="flex gap-2">
          <button class="focus-ring ui-button-primary px-4 py-2" type="submit">
            保存标签
          </button>
          <button
            class="focus-ring ui-button-secondary px-4 py-2"
            type="button"
            @click="resetTagForm"
          >
            清空
          </button>
        </div>
      </form>

      <div class="ui-surface p-6">
        <h2 class="font-display text-3xl">标签云</h2>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            v-for="tag in contentStore.tagCloud"
            :key="tag.id"
            class="focus-ring min-h-11 rounded-md border border-line bg-paper px-4 py-3 text-left hover:border-moss hover:bg-white hover:text-moss"
            type="button"
            @click="editTag(tag)"
          >
            <span class="font-semibold">#{{ tag.name }}</span>
            <span class="ml-2 text-sm text-ink/45">{{ tag.articleCount }}</span>
          </button>
        </div>
        <div class="mt-8 grid gap-3">
          <div
            v-for="tag in contentStore.tags"
            :key="tag.id"
            class="grid gap-3 border-t border-line pt-3 md:grid-cols-[1fr_auto]"
          >
            <div>
              <p class="font-semibold">#{{ tag.name }}</p>
              <p class="mt-1 text-sm text-ink/55">
                /{{ tag.slug }} · {{ tag.articleCount }} 篇文章
              </p>
            </div>
            <div class="flex gap-2">
              <button
                class="focus-ring rounded-md border border-line px-3 py-2 text-sm hover:border-moss hover:text-moss"
                type="button"
                @click="editTag(tag)"
              >
                编辑
              </button>
              <button
                class="focus-ring rounded-md border border-coral px-3 py-2 text-sm text-coral"
                type="button"
                @click="removeTag(tag)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
