<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ArticleCard from "@/components/ArticleCard.vue";
import { useContentStore } from "@/stores/content";
import type { Category, Tag } from "@/types/blog";

const contentStore = useContentStore();
const route = useRoute();
const router = useRouter();
const articlesSection = ref<HTMLElement | null>(null);

const categories = computed(() => contentStore.visibleCategories);
const tags = computed(() => contentStore.tagCloud);
const allArticles = computed(() => contentStore.publishedArticles);

// ─── 实际文章数 ──────────────────────────────────────────────
const catCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const a of allArticles.value) map.set(a.category.id, (map.get(a.category.id) ?? 0) + 1);
  return map;
});

const tagCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const a of allArticles.value) for (const t of a.tags) map.set(t.id, (map.get(t.id) ?? 0) + 1);
  return map;
});

function catDisplayCount(cat: Category): number {
  return contentStore.loading ? cat.articleCount : (catCountMap.value.get(cat.id) ?? 0);
}
function tagDisplayCount(tag: Tag): number {
  return contentStore.loading ? tag.articleCount : (tagCountMap.value.get(tag.id) ?? 0);
}

// ─── 分类多选 ────────────────────────────────────────────────
const selectedCatIds = ref<Set<string>>(new Set());
const hasCatSelection = computed(() => selectedCatIds.value.size > 0);
const isCatSelected = (cat: Category) => selectedCatIds.value.has(cat.id);

function toggleCategory(cat: Category) {
  const next = new Set(selectedCatIds.value);
  if (!next.has(cat.id)) {
    next.add(cat.id);
    if (next.size === 1 && !hasTagSelection.value)
      nextTick(() => articlesSection.value?.scrollIntoView({ behavior: "smooth", block: "start" }));
  } else {
    next.delete(cat.id);
  }
  selectedCatIds.value = next;
  // 清理在新分类范围内不可见的已选标签
  const visSet = new Set(visibleTags.value.map((t) => t.id));
  selectedTagIds.value = new Set([...selectedTagIds.value].filter((id) => visSet.has(id)));
  syncToUrl();
}

function clearCats() {
  selectedCatIds.value = new Set();
  syncToUrl();
}

// ─── 标签多选 ────────────────────────────────────────────────
const selectedTagIds = ref<Set<string>>(new Set());
const hasTagSelection = computed(() => selectedTagIds.value.size > 0);
// AND = 文章必须包含所有选中标签；OR = 包含任一即可
const tagFilterMode = ref<"or" | "and">("or");
const isTagSelected = (tag: Tag) => selectedTagIds.value.has(tag.id);

function toggleTag(tag: Tag) {
  const next = new Set(selectedTagIds.value);
  if (next.has(tag.id)) {
    next.delete(tag.id);
  } else {
    next.add(tag.id);
    if (next.size === 1 && !hasCatSelection.value)
      nextTick(() => articlesSection.value?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  selectedTagIds.value = next;
  syncToUrl();
}

function clearTags() {
  selectedTagIds.value = new Set();
  syncToUrl();
}

function toggleTagMode() {
  tagFilterMode.value = tagFilterMode.value === "or" ? "and" : "or";
  syncToUrl();
}

const hasAnySelection = computed(() => hasCatSelection.value || hasTagSelection.value);

function clearAll() {
  selectedCatIds.value = new Set();
  selectedTagIds.value = new Set();
  syncToUrl();
}

// ─── 可见分类（过滤 0 文章） ───────────────────────────────────
const visibleCategories = computed(() =>
  contentStore.loading ? categories.value : categories.value.filter((c) => catDisplayCount(c) > 0),
);

// ─── 可见标签（分类过滤 + 过滤 0 文章） ───────────────────────
const visibleTags = computed(() => {
  let list = tags.value;
  if (hasCatSelection.value) {
    const tagIdSet = new Set<string>();
    for (const a of allArticles.value)
      if (selectedCatIds.value.has(a.category.id)) for (const t of a.tags) tagIdSet.add(t.id);
    list = list.filter((t) => tagIdSet.has(t.id));
  }
  return contentStore.loading ? list : list.filter((t) => tagDisplayCount(t) > 0);
});

// ─── 标签云热度分级 ──────────────────────────────────────────
const tagMaxCount = computed(() =>
  visibleTags.value.reduce((m, t) => Math.max(m, tagDisplayCount(t)), 1),
);

function tagSizeTier(tag: Tag): "sm" | "base" | "lg" {
  if (tagMaxCount.value <= 1) return "base";
  const ratio = tagDisplayCount(tag) / tagMaxCount.value;
  return ratio >= 0.67 ? "lg" : ratio >= 0.34 ? "base" : "sm";
}

// ─── 标签折叠 ────────────────────────────────────────────────
const TAG_LIMIT = 12;
const tagExpanded = ref(false);
const displayedTags = computed(() =>
  tagExpanded.value || visibleTags.value.length <= TAG_LIMIT
    ? visibleTags.value
    : visibleTags.value.slice(0, TAG_LIMIT),
);

// ─── 文章过滤工具 ────────────────────────────────────────────
function matchesTags(articleTags: Tag[], ids: Set<string>, mode: "or" | "and"): boolean {
  if (mode === "and") return [...ids].every((id) => articleTags.some((t) => t.id === id));
  return articleTags.some((t) => ids.has(t.id));
}

// ─── 按分类分组（有标签选中时在分类内进一步过滤） ─────────────
const groupedByCategory = computed(() =>
  visibleCategories.value
    .filter((cat) => selectedCatIds.value.has(cat.id))
    .map((cat) => {
      let articles = allArticles.value.filter((a) => a.category.id === cat.id);
      if (hasTagSelection.value)
        articles = articles.filter((a) => matchesTags(a.tags, selectedTagIds.value, tagFilterMode.value));
      return { category: cat, articles };
    }),
);

// ─── 按标签分组（OR 模式，无分类选中时）───────────────────────
const groupedByTag = computed(() => {
  if (hasCatSelection.value || tagFilterMode.value === "and") return [];
  return visibleTags.value
    .filter((tag) => selectedTagIds.value.has(tag.id))
    .map((tag) => ({
      tag,
      articles: allArticles.value.filter((a) => a.tags.some((t) => t.id === tag.id)),
    }));
});

// ─── AND 模式纯标签结果（无分类选中时）──────────────────────
const showTagAndSection = computed(
  () => !hasCatSelection.value && tagFilterMode.value === "and" && hasTagSelection.value,
);
const tagAndArticles = computed(() => {
  if (!showTagAndSection.value) return [] as (typeof allArticles.value);
  return allArticles.value.filter((a) => matchesTags(a.tags, selectedTagIds.value, "and"));
});

// ─── 摘要统计 ────────────────────────────────────────────────
const totalFilteredCount = computed(() => {
  if (hasCatSelection.value) return groupedByCategory.value.reduce((s, g) => s + g.articles.length, 0);
  if (showTagAndSection.value) return tagAndArticles.value.length;
  const ids = new Set<string>();
  for (const g of groupedByTag.value) for (const a of g.articles) ids.add(a.id);
  return ids.size;
});

// ─── 默认文章分页（无筛选时，最新 100 篇）────────────────────
const DEFAULT_LIMIT = 100;
const PAGE_SIZE = 10;
const currentPage = ref(1);

const defaultArticles = computed(() => allArticles.value.slice(0, DEFAULT_LIMIT));
const totalDefaultPages = computed(() => Math.ceil(defaultArticles.value.length / PAGE_SIZE));
const pagedDefaultArticles = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return defaultArticles.value.slice(start, start + PAGE_SIZE);
});

// 清除筛选后跳回第一页
watch(hasAnySelection, (val) => { if (!val) currentPage.value = 1; });

// ─── 筛选结果分页（有选中时）────────────────────────────────
const flatFilteredArticles = computed(() => {
  const seen = new Set<string>();
  const result: (typeof allArticles.value) = [];
  const push = (a: (typeof allArticles.value)[0]) => { if (!seen.has(a.id)) { seen.add(a.id); result.push(a); } };
  if (hasCatSelection.value) {
    for (const g of groupedByCategory.value) g.articles.forEach(push);
  } else if (showTagAndSection.value) {
    tagAndArticles.value.forEach(push);
  } else {
    for (const g of groupedByTag.value) g.articles.forEach(push);
  }
  return result;
});
const filteredPage = ref(1);
const totalFilteredPages = computed(() => Math.ceil(flatFilteredArticles.value.length / PAGE_SIZE));
const pagedFilteredArticles = computed(() => {
  const start = (filteredPage.value - 1) * PAGE_SIZE;
  return flatFilteredArticles.value.slice(start, start + PAGE_SIZE);
});
// 筛选条件变化时跳回第一页
watch(totalFilteredCount, () => { filteredPage.value = 1; });

const selectedCatNames = computed(() =>
  categories.value.filter((c) => selectedCatIds.value.has(c.id)).map((c) => c.name),
);
const selectedTagNames = computed(() =>
  tags.value.filter((t) => selectedTagIds.value.has(t.id)).map((t) => t.name),
);

// ─── URL 状态持久化 ───────────────────────────────────────────
function syncToUrl() {
  const catSlugs = categories.value
    .filter((c) => selectedCatIds.value.has(c.id))
    .map((c) => c.slug)
    .join(",");
  const tagSlugs = tags.value
    .filter((t) => selectedTagIds.value.has(t.id))
    .map((t) => t.slug)
    .join(",");
  const query: Record<string, string> = {};
  if (catSlugs) query.cats = catSlugs;
  if (tagSlugs) query.tags = tagSlugs;
  if (tagFilterMode.value === "and") query.mode = "and";
  router.replace({ query: Object.keys(query).length ? query : {} });
}

function restoreFromUrl() {
  const catsParam = typeof route.query.cats === "string" ? route.query.cats : undefined;
  const tagsParam = typeof route.query.tags === "string" ? route.query.tags : undefined;
  const modeParam = typeof route.query.mode === "string" ? route.query.mode : undefined;
  if (modeParam === "and") tagFilterMode.value = "and";
  if (catsParam) {
    const ids = catsParam
      .split(",")
      .filter(Boolean)
      .map((s) => categories.value.find((c) => c.slug === s)?.id)
      .filter((id): id is string => !!id);
    if (ids.length) selectedCatIds.value = new Set(ids);
  }
  if (tagsParam) {
    const ids = tagsParam
      .split(",")
      .filter(Boolean)
      .map((s) => tags.value.find((t) => t.slug === s)?.id)
      .filter((id): id is string => !!id);
    if (ids.length) selectedTagIds.value = new Set(ids);
  }
}

onMounted(async () => {
  await contentStore.loadPublicContent();
  restoreFromUrl();
});
</script>

<template>
  <section class="content-shell py-8 md:py-10">
    <!-- 有选中时显示清除全部按钮 -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div v-if="hasAnySelection" class="mb-3 flex justify-end">
        <button
          class="focus-ring flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-4 py-1.5 text-sm font-semibold text-ink/70 transition hover:border-coral/40 hover:text-coral"
          @click="clearAll"
        >
          清除全部 <span class="text-base leading-none">×</span>
        </button>
      </div>
    </Transition>

    <!-- ====== 分类区块 ====== -->
    <div class="mb-3">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-ink/45">分类</h2>
        <button
          v-if="hasCatSelection"
          class="focus-ring text-xs text-ink/45 transition hover:text-coral"
          @click="clearCats"
        >
          已选 {{ selectedCatIds.size }} 个 &times;
        </button>
      </div>

      <!-- 骨架屏 -->
      <div v-if="contentStore.loading && !visibleCategories.length" class="flex flex-wrap gap-2">
        <div
          v-for="i in 5"
          :key="i"
          class="h-8 animate-pulse rounded-full bg-line/40"
          :style="{ width: `${64 + i * 16}px` }"
        />
      </div>

      <div v-else-if="visibleCategories.length" class="flex flex-wrap gap-2">
        <button
          v-for="category in visibleCategories"
          :key="category.id"
          class="focus-ring flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:shadow-sm"
          :class="
            isCatSelected(category)
              ? 'border-transparent text-white shadow-sm'
              : 'border-line bg-white/70 text-ink/70 hover:border-line/80 hover:bg-white'
          "
          :style="isCatSelected(category) ? { backgroundColor: category.color } : {}"
          @click="toggleCategory(category)"
        >
          <span
            v-if="!isCatSelected(category)"
            class="h-2 w-2 shrink-0 rounded-full"
            :style="{ backgroundColor: category.color }"
          />
          <svg
            v-else
            class="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="2,7 5.5,10.5 12,3.5" />
          </svg>
          {{ category.name }}
          <span
            class="rounded-full px-1.5 py-0.5 text-xs font-semibold"
            :class="isCatSelected(category) ? 'bg-white/25 text-white' : 'bg-line/40 text-ink/55'"
          >
            {{ catDisplayCount(category) }}
          </span>
        </button>
      </div>

      <p v-else-if="!contentStore.loading" class="text-sm text-ink/45">暂无分类</p>
    </div>

    <!-- 分隔线 -->
    <div class="mb-3 border-t border-line/30" />

    <!-- ====== 标签区块 ====== -->
    <div class="mb-8">
      <div class="mb-3 flex items-center justify-between">
        <!-- 标题 + AND/OR 模式切换 -->
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-ink/45">标签</h2>
          <button
            v-if="visibleTags.length > 1"
            class="focus-ring flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all duration-200"
            :class="
              tagFilterMode === 'and'
                ? 'border-brand/40 bg-brand/8 font-semibold text-brand'
                : 'border-line text-ink/40 hover:border-brand/30 hover:text-brand/70'
            "
            :title="
              tagFilterMode === 'or'
                ? '当前：包含任一标签 — 点击切换为全部匹配'
                : '当前：必须包含所有标签 — 点击切换为任一匹配'
            "
            @click="toggleTagMode"
          >
            {{ tagFilterMode === "or" ? "任一" : "全部" }}
          </button>
        </div>
        <button
          v-if="hasTagSelection"
          class="focus-ring text-xs text-ink/45 transition hover:text-coral"
          @click="clearTags"
        >
          已选 {{ selectedTagIds.size }} 个 &times;
        </button>
      </div>

      <!-- 骨架屏 -->
      <div v-if="contentStore.loading && !visibleTags.length" class="flex flex-wrap gap-2">
        <div
          v-for="i in 8"
          :key="i"
          class="h-7 animate-pulse rounded-full bg-line/40"
          :style="{ width: `${48 + i * 10}px` }"
        />
      </div>

      <div v-else-if="visibleTags.length" class="flex flex-wrap items-center gap-2">
        <!-- 标签 chip：按热度分 3 档大小 -->
        <button
          v-for="tag in displayedTags"
          :key="tag.id"
          class="focus-ring flex items-center gap-1 rounded-full border transition-all duration-200 hover:shadow-sm"
          :class="[
            isTagSelected(tag)
              ? 'border-brand/50 bg-brand/10 font-semibold text-brand shadow-sm'
              : 'border-line bg-white/70 text-ink/65 hover:border-brand/30 hover:text-brand',
            tagSizeTier(tag) === 'lg'
              ? 'px-3 py-1.5 text-base'
              : tagSizeTier(tag) === 'sm'
                ? 'px-2 py-0.5 text-xs'
                : 'px-2.5 py-1 text-sm',
          ]"
          @click="toggleTag(tag)"
        >
          <svg
            v-if="isTagSelected(tag)"
            class="h-3 w-3 shrink-0"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="2,7 5.5,10.5 12,3.5" />
          </svg>
          <span v-else class="text-ink/35">#</span>
          {{ tag.name }}
          <span
            class="rounded-full px-1.5 py-0.5 text-xs"
            :class="isTagSelected(tag) ? 'bg-brand/15 font-semibold text-brand' : 'text-ink/40'"
          >
            {{ tagDisplayCount(tag) }}
          </span>
        </button>

        <!-- 展开 / 收起按钮 -->
        <button
          v-if="visibleTags.length > TAG_LIMIT"
          class="focus-ring rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-ink/45 transition hover:border-brand/30 hover:text-brand"
          @click="tagExpanded = !tagExpanded"
        >
          {{ tagExpanded ? "收起 ↑" : `展开全部 ${visibleTags.length} 个 ↓` }}
        </button>
      </div>

      <p v-else-if="!contentStore.loading" class="text-sm text-ink/45">
        {{ hasCatSelection ? "所选分类下暂无标签" : "暂无标签" }}
      </p>
    </div>

    <!-- 错误提示 -->
    <p
      v-if="contentStore.errorMessage"
      class="mt-2 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ contentStore.errorMessage }}
    </p>

    <!-- ====== 文章结果区域 ====== -->

    <!-- 默认：无筛选时展示最新文章（分页） -->
    <div v-if="!hasAnySelection" class="space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-ink/45">最新文章</h2>
        <span v-if="defaultArticles.length" class="text-xs text-ink/40">
          共 {{ defaultArticles.length }} 篇 · 第 {{ currentPage }}/{{ totalDefaultPages }} 页
        </span>
      </div>

      <div v-if="contentStore.loading" class="grid gap-3 lg:grid-cols-2">
        <div v-for="i in 4" :key="i" class="ui-surface h-32 animate-pulse rounded-[8px] bg-line/30" />
      </div>
      <TransitionGroup
        v-else-if="pagedDefaultArticles.length"
        name="card-list"
        tag="div"
        class="grid gap-3 lg:grid-cols-2"
      >
        <ArticleCard v-for="article in pagedDefaultArticles" :key="article.id" :article="article" />
      </TransitionGroup>
      <p v-else-if="!contentStore.loading" class="text-sm text-ink/45">暂无文章</p>

      <!-- 分页控件 -->
      <div v-if="totalDefaultPages > 1" class="flex items-center justify-center gap-1 pt-2">
        <button
          class="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-line text-sm text-ink/50 transition hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-30"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >‹</button>
        <button
          v-for="p in totalDefaultPages"
          :key="p"
          class="focus-ring flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition"
          :class="
            p === currentPage
              ? 'border-brand bg-brand text-white'
              : 'border-line text-ink/55 hover:border-brand/40 hover:text-brand'
          "
          @click="currentPage = p"
        >{{ p }}</button>
        <button
          class="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-line text-sm text-ink/50 transition hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-30"
          :disabled="currentPage >= totalDefaultPages"
          @click="currentPage++"
        >›</button>
      </div>
    </div>

    <!-- 筛选结果：有分类或标签选中时 -->
    <div v-else ref="articlesSection" class="scroll-mt-24 space-y-10">
      <!-- ── 筛选摘要栏 ── -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/50 bg-line/20 px-4 py-3"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
          <!-- 分类名（最多展示 3 个 + 数量提示） -->
          <template v-for="(name, i) in selectedCatNames.slice(0, 3)" :key="`cs${i}`">
            <span v-if="i > 0" class="text-ink/25">·</span>
            <span class="font-medium text-ink/80">{{ name }}</span>
          </template>
          <span v-if="selectedCatNames.length > 3" class="text-xs text-ink/45">
            +{{ selectedCatNames.length - 3 }}
          </span>
          <!-- 分隔箭头 -->
          <span v-if="hasCatSelection && hasTagSelection" class="mx-0.5 text-ink/30">→</span>
          <!-- 标签（最多 5 个 + 数量提示） -->
          <span
            v-for="(name, i) in selectedTagNames.slice(0, 5)"
            :key="`ts${i}`"
            class="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand"
          >#{{ name }}</span>
          <span v-if="selectedTagNames.length > 5" class="text-xs text-ink/45">
            +{{ selectedTagNames.length - 5 }}
          </span>
          <!-- AND 模式徽章 -->
          <span
            v-if="tagFilterMode === 'and' && hasTagSelection && selectedTagIds.size > 1"
            class="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600"
          >全部匹配</span>
        </div>
        <span class="shrink-0 text-sm text-ink/50">
          共 <strong class="text-ink/80">{{ totalFilteredCount }}</strong> 篇
        </span>
      </div>

      <!-- ── 分页文章列表 ── -->
      <div v-if="contentStore.loading" class="grid gap-3 lg:grid-cols-2">
        <div v-for="i in 4" :key="i" class="ui-surface h-32 animate-pulse rounded-[8px] bg-line/30" />
      </div>
      <TransitionGroup
        v-else-if="pagedFilteredArticles.length"
        name="card-list"
        tag="div"
        class="grid gap-3 lg:grid-cols-2"
      >
        <ArticleCard v-for="article in pagedFilteredArticles" :key="article.id" :article="article" />
      </TransitionGroup>
      <div
        v-else
        class="ui-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-ink/50"
      >
        <span>{{ hasTagSelection ? '没有符合所选筛选条件的文章' : '该分类下暂无公开文章' }}</span>
        <div class="flex gap-3">
          <button v-if="hasTagSelection" class="focus-ring text-xs text-brand transition hover:underline" @click="clearTags">取消标签筛选</button>
          <button class="focus-ring text-xs text-coral transition hover:underline" @click="clearAll">清除全部</button>
        </div>
      </div>

      <!-- 分页控件 -->
      <div v-if="totalFilteredPages > 1" class="flex items-center justify-center gap-1 pt-2">
        <button
          class="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-line text-sm text-ink/50 transition hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-30"
          :disabled="filteredPage <= 1"
          @click="filteredPage--"
        >‹</button>
        <button
          v-for="p in totalFilteredPages"
          :key="p"
          class="focus-ring flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition"
          :class="p === filteredPage ? 'border-brand bg-brand text-white' : 'border-line text-ink/55 hover:border-brand/40 hover:text-brand'"
          @click="filteredPage = p"
        >{{ p }}</button>
        <button
          class="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-line text-sm text-ink/50 transition hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-30"
          :disabled="filteredPage >= totalFilteredPages"
          @click="filteredPage++"
        >›</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 文章卡片入场动画 */
.card-list-enter-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.card-list-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.card-list-leave-active {
  transition: opacity 0.15s ease;
}
.card-list-leave-to {
  opacity: 0;
}
.card-list-move {
  transition: transform 0.28s ease;
}
</style>
