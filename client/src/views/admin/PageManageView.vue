<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { getApiErrorMessage } from "@/api/auth";
import { createSlug } from "@/stores/content";
import { usePagesStore, type PageMutationPayload } from "@/stores/pages";
import type { CustomPage, PageType } from "@/types/blog";
import { handleMarkdownInteraction, renderMarkdown } from "@/utils/markdown";

interface PageForm {
  id: string;
  title: string;
  slug: string;
  pageType: PageType;
  content: string;
  summary: string;
  isHomeVisible: boolean;
  status: "draft" | "published";
  seoTitle: string;
  seoDescription: string;
}

const pagesStore = usePagesStore();
const notice = ref("");
const pageError = ref("");

const pageTypes: { value: PageType; label: string }[] = [
  { value: "about", label: "关于我" },
  { value: "custom", label: "自定义页面" },
  { value: "portfolio", label: "作品集" },
  { value: "resume", label: "在线简历" },
];

const pageForm = reactive<PageForm>(createPageForm());

const renderedPreview = computed(() =>
  renderMarkdown(pageForm.content || "页面内容会在这里预览。"),
);

const pageStats = computed(() => ({
  published: pagesStore.pages.filter((page) => page.status === "published")
    .length,
  drafts: pagesStore.pages.filter((page) => page.status === "draft").length,
  visible: pagesStore.visibleCustomPages.length,
}));

onMounted(() => {
  void loadAdminPages();
});

async function loadAdminPages() {
  try {
    await pagesStore.loadAdminPages();
  } catch (error) {
    pageError.value = getApiErrorMessage(error, "页面管理接口加载失败");
  }
}

function createPageForm(): PageForm {
  return {
    id: "",
    title: "",
    slug: "",
    pageType: "custom",
    content:
      "# 页面标题\n\n写下页面正文。支持 **加粗**、`代码`、列表、引用和链接。\n\n- 第一段重点\n- 下一步行动",
    summary: "",
    isHomeVisible: false,
    status: "draft",
    seoTitle: "",
    seoDescription: "",
  };
}

function resetPageForm() {
  Object.assign(pageForm, createPageForm());
  pageError.value = "";
  notice.value = "";
}

function typeLabel(type: PageType) {
  return pageTypes.find((item) => item.value === type)?.label ?? "自定义页面";
}

function statusClass(status: string) {
  if (status === "published" || status === "approved") {
    return "border-moss text-moss";
  }

  if (status === "pending") {
    return "border-cobalt text-cobalt";
  }

  return "border-coral text-coral";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildPagePayload(): PageMutationPayload | null {
  pageError.value = "";
  const title = pageForm.title.trim();
  const content = pageForm.content.trim();
  const slug = createSlug(
    pageForm.slug || title,
    pageForm.id || `page-${Date.now().toString(36)}`,
  );

  if (!title) {
    pageError.value = "页面标题不能为空。";
    return null;
  }

  if (!content) {
    pageError.value = "页面正文不能为空。";
    return null;
  }

  return {
    id: pageForm.id || undefined,
    title,
    slug,
    pageType: pageForm.pageType,
    content,
    summary: pageForm.summary.trim(),
    isHomeVisible: pageForm.isHomeVisible,
    status: pageForm.status,
    seoTitle: pageForm.seoTitle.trim(),
    seoDescription: pageForm.seoDescription.trim(),
  };
}

async function submitPage() {
  const payload = buildPagePayload();
  if (!payload) {
    return;
  }

  try {
    const page = await pagesStore.savePage(payload);
    notice.value = `页面已保存：${page.title}`;
    Object.assign(pageForm, {
      ...pageForm,
      id: page.id,
      slug: page.slug,
    });
  } catch (error) {
    pageError.value = getApiErrorMessage(error, "页面保存失败");
  }
}

async function editPage(page: CustomPage) {
  pageError.value = "";
  notice.value = "";
  let detail = page;
  try {
    detail = await pagesStore.loadAdminPageDetail(page.id);
  } catch (error) {
    pageError.value = getApiErrorMessage(error, "页面详情加载失败");
  }

  Object.assign(pageForm, {
    id: detail.id,
    title: detail.title,
    slug: detail.slug,
    pageType: detail.pageType,
    content: detail.content,
    summary: detail.summary ?? "",
    isHomeVisible: detail.isHomeVisible,
    status: detail.status,
    seoTitle: detail.seoTitle ?? "",
    seoDescription: detail.seoDescription ?? "",
  });
}

async function removePage(page: CustomPage) {
  if (!confirm(`确认删除页面《${page.title}》？此操作不能撤销。`)) {
    return;
  }

  try {
    await pagesStore.deletePage(page.id);
    notice.value = `页面已删除：${page.title}`;
    if (pageForm.id === page.id) {
      resetPageForm();
    }
  } catch (error) {
    pageError.value = getApiErrorMessage(error, "页面删除失败");
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Pages</p>
        <h1 class="mt-2 font-display text-5xl text-brand">页面管理</h1>
        <p class="mt-3 max-w-2xl text-ink/65">
          管理关于我、作品集、项目介绍等独立页面。
        </p>
      </div>
      <button
        class="focus-ring ui-button-primary px-5 py-3"
        type="button"
        @click="resetPageForm()"
      >
        新建页面
      </button>
    </div>

    <p
      v-if="notice"
      class="mt-5 rounded-md border border-moss bg-white px-4 py-3 text-sm font-medium text-moss shadow-insetline"
    >
      {{ notice }}
    </p>

    <section
      class="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]"
    >
      <form class="ui-surface grid gap-5 p-6" @submit.prevent="submitPage">
        <div class="grid gap-4 md:grid-cols-2">
          <label>
            <span class="text-sm text-ink/60">标题</span>
            <input
              v-model="pageForm.title"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              type="text"
            />
          </label>
          <label>
            <span class="text-sm text-ink/60">Slug</span>
            <input
              v-model="pageForm.slug"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              placeholder="留空自动生成"
              type="text"
            />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <label>
            <span class="text-sm text-ink/60">页面类型</span>
            <select
              v-model="pageForm.pageType"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
            >
              <option
                v-for="type in pageTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </label>
          <label>
            <span class="text-sm text-ink/60">状态</span>
            <select
              v-model="pageForm.status"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </label>
          <label
            class="mt-7 flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm hover:bg-white"
          >
            <input
              v-model="pageForm.isHomeVisible"
              class="accent-brand"
              type="checkbox"
            />
            在首页/导航推荐
          </label>
        </div>

        <label>
          <span class="text-sm text-ink/60">摘要</span>
          <textarea
            v-model="pageForm.summary"
            class="focus-ring mt-2 min-h-20 w-full resize-y rounded-md border border-line px-3 py-2"
          ></textarea>
        </label>

        <div class="grid gap-4 xl:grid-cols-2">
          <label>
            <span class="text-sm text-ink/60">Markdown 正文</span>
            <textarea
              v-model="pageForm.content"
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

        <div class="grid gap-4 md:grid-cols-2">
          <label>
            <span class="text-sm text-ink/60">SEO 标题</span>
            <input
              v-model="pageForm.seoTitle"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              type="text"
            />
          </label>
          <label>
            <span class="text-sm text-ink/60">SEO 描述</span>
            <input
              v-model="pageForm.seoDescription"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              type="text"
            />
          </label>
        </div>

        <p v-if="pageError" class="text-sm text-coral">{{ pageError }}</p>
        <div class="flex flex-wrap gap-2">
          <button class="focus-ring ui-button-primary px-4 py-2" type="submit">
            保存页面
          </button>
          <button
            class="focus-ring ui-button-secondary px-4 py-2"
            type="button"
            @click="resetPageForm"
          >
            清空
          </button>
        </div>
      </form>

      <div class="grid gap-5">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">已发布</p>
            <p class="mt-2 font-display text-3xl">{{ pageStats.published }}</p>
          </div>
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">草稿</p>
            <p class="mt-2 font-display text-3xl">{{ pageStats.drafts }}</p>
          </div>
          <div class="ui-surface-soft p-5">
            <p class="text-sm text-ink/55">推荐页</p>
            <p class="mt-2 font-display text-3xl">{{ pageStats.visible }}</p>
          </div>
        </div>

        <div class="ui-surface overflow-hidden rounded-[16px]">
          <article
            v-for="page in pagesStore.adminPages"
            :key="page.id"
            class="grid gap-4 border-b border-line p-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-display text-3xl">{{ page.title }}</h2>
                <span class="rounded-md border px-2 py-1 text-xs">
                  {{ typeLabel(page.pageType) }}
                </span>
                <span
                  class="rounded-md border px-2 py-1 text-xs"
                  :class="statusClass(page.status)"
                >
                  {{ page.status === "published" ? "已发布" : "草稿" }}
                </span>
              </div>
              <p class="mt-2 break-all text-sm text-ink/55">
                /pages/{{ page.slug }} · {{ formatDate(page.updatedAt) }}
              </p>
              <p class="mt-3 leading-7 text-ink/65">
                {{ page.summary || "这个页面暂时没有摘要。" }}
              </p>
            </div>
            <div class="flex flex-wrap items-start gap-2 md:justify-end">
              <RouterLink
                v-if="page.status === 'published'"
                class="focus-ring min-h-9 rounded-md border border-line px-3 py-2 text-sm hover:border-brand hover:text-brand"
                :to="
                  page.pageType === 'about' ? '/about' : `/pages/${page.slug}`
                "
              >
                查看
              </RouterLink>
              <button
                class="focus-ring min-h-9 rounded-md border border-line px-3 py-2 text-sm hover:border-moss hover:text-moss"
                type="button"
                @click="editPage(page)"
              >
                编辑
              </button>
              <button
                class="focus-ring min-h-9 rounded-md border border-coral px-3 py-2 text-sm text-coral"
                type="button"
                @click="removePage(page)"
              >
                删除
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
