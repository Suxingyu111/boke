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
const syncingFromRoute = ref(false);

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
  if (syncingFromRoute.value) {
    return;
  }

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
  const activePage = hasAnySelection.value ? filteredPage.value : currentPage.value;
  if (activePage > 1) query.page = String(activePage);
  router.replace({ query: Object.keys(query).length ? query : {} });
}

function restoreFromUrl() {
  syncingFromRoute.value = true;
  const catsParam = typeof route.query.cats === "string" ? route.query.cats : undefined;
  const tagsParam = typeof route.query.tags === "string" ? route.query.tags : undefined;
  const modeParam = typeof route.query.mode === "string" ? route.query.mode : undefined;
  const pageParam = Number.parseInt(String(route.query.page ?? "1"), 10);
  const restoredPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  selectedCatIds.value = new Set();
  selectedTagIds.value = new Set();
  tagFilterMode.value = "or";
  currentPage.value = restoredPage;
  filteredPage.value = restoredPage;

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
  syncingFromRoute.value = false;
}

onMounted(async () => {
  await contentStore.loadPublicContent();
  restoreFromUrl();
});

watch(
  () => route.query,
  () => {
    restoreFromUrl();
  },
);

watch(currentPage, () => {
  if (!hasAnySelection.value) {
    syncToUrl();
  }
});

watch(filteredPage, () => {
  if (hasAnySelection.value) {
    syncToUrl();
  }
});
</script>

<template>
  <section class="content-shell cats-page">

    <!-- ── Active filter strip ── -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="hasAnySelection" class="filter-strip">
        <div class="filter-strip__chips">
          <button
            v-for="cat in categories.filter(c => selectedCatIds.has(c.id))"
            :key="`strip-cat-${cat.id}`"
            class="filter-strip__cat-chip focus-ring"
            :style="{ backgroundColor: cat.color }"
            @click="toggleCategory(cat)"
          >
            <span class="filter-strip__cat-chip-dot"></span>
            {{ cat.name }} ×
          </button>
          <button
            v-for="tag in tags.filter(t => selectedTagIds.has(t.id))"
            :key="`strip-tag-${tag.id}`"
            class="filter-strip__tag-chip focus-ring"
            @click="toggleTag(tag)"
          >
            #{{ tag.name }} ×
          </button>
        </div>
        <button class="filter-strip__clear focus-ring" @click="clearAll">清除全部</button>
      </div>
    </Transition>

    <!-- ── Filter panel ── -->
    <div class="cats-filter-panel">

      <!-- Left: Categories -->
      <div class="cats-filter-col">
        <div class="cats-col-header">
          <span class="cats-col-label">分类</span>
          <button
            v-if="hasCatSelection"
            class="cats-col-action focus-ring"
            @click="clearCats"
          >已选 {{ selectedCatIds.size }} 个 ×</button>
        </div>

        <!-- Skeleton -->
        <div v-if="contentStore.loading && !visibleCategories.length" class="cat-grid">
          <div
            v-for="i in 6"
            :key="i"
            class="cats-skel"
            style="height: 2.35rem; border-radius: 7px"
          />
        </div>

        <div v-else-if="visibleCategories.length" class="cat-grid">
          <button
            v-for="category in visibleCategories"
            :key="category.id"
            class="cat-card focus-ring"
            :class="{ 'cat-card--active': isCatSelected(category) }"
            :style="isCatSelected(category) ? { backgroundColor: category.color } : {}"
            @click="toggleCategory(category)"
          >
            <span
              class="cat-card__bar"
              :style="isCatSelected(category) ? {} : { background: category.color }"
            ></span>
            <span class="cat-card__name">{{ category.name }}</span>
            <span class="cat-card__count">{{ catDisplayCount(category) }}</span>
            <svg
              v-if="isCatSelected(category)"
              class="cat-card__check"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="2,7 5.5,10.5 12,3.5" />
            </svg>
          </button>
        </div>

        <p v-else-if="!contentStore.loading" class="text-sm" style="color: rgba(16,20,26,0.42)">暂无分类</p>
      </div>

      <!-- Right: Tags -->
      <div class="cats-filter-col">
        <div class="cats-col-header">
          <div class="tag-cloud-header">
            <span class="cats-col-label">标签</span>
            <!-- AND/OR segmented control -->
            <div v-if="visibleTags.length > 1" class="filter-mode-seg">
              <button
                class="filter-mode-seg__btn"
                :class="{ 'filter-mode-seg__btn--active': tagFilterMode === 'or' }"
                :title="'包含任一标签'"
                @click="tagFilterMode !== 'or' && toggleTagMode()"
              >任一</button>
              <button
                class="filter-mode-seg__btn"
                :class="{ 'filter-mode-seg__btn--active': tagFilterMode === 'and' }"
                :title="'必须包含所有标签'"
                @click="tagFilterMode !== 'and' && toggleTagMode()"
              >全部</button>
            </div>
          </div>
          <button
            v-if="hasTagSelection"
            class="cats-col-action focus-ring"
            @click="clearTags"
          >已选 {{ selectedTagIds.size }} 个 ×</button>
        </div>

        <!-- Skeleton -->
        <div v-if="contentStore.loading && !visibleTags.length" class="tag-cloud">
          <div
            v-for="i in 10"
            :key="i"
            class="cats-skel"
            :style="{ height: '1.7rem', width: `${44 + i * 9}px`, borderRadius: '5px' }"
          />
        </div>

        <div v-else-if="visibleTags.length" class="tag-cloud">
          <button
            v-for="tag in displayedTags"
            :key="tag.id"
            class="tag-chip focus-ring"
            :class="[
              { 'tag-chip--active': isTagSelected(tag) },
              `tag-chip--${tagSizeTier(tag)}`,
            ]"
            @click="toggleTag(tag)"
          >
            <span class="tag-chip__hash">
              <svg
                v-if="isTagSelected(tag)"
                style="width:0.7rem;height:0.7rem"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><polyline points="2,7 5.5,10.5 12,3.5" /></svg>
              <span v-else>#</span>
            </span>
            {{ tag.name }}
            <span class="tag-chip__count">{{ tagDisplayCount(tag) }}</span>
          </button>

          <button
            v-if="visibleTags.length > TAG_LIMIT"
            class="tag-expand-btn focus-ring"
            @click="tagExpanded = !tagExpanded"
          >
            {{ tagExpanded ? "收起 ↑" : `展开 ${visibleTags.length} 个 ↓` }}
          </button>
        </div>

        <p v-else-if="!contentStore.loading" class="text-sm" style="color: rgba(16,20,26,0.42)">
          {{ hasCatSelection ? "所选分类下暂无标签" : "暂无标签" }}
        </p>
      </div>
    </div>

    <!-- ── Error ── -->
    <p
      v-if="contentStore.errorMessage"
      class="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    >{{ contentStore.errorMessage }}</p>

    <!-- ── Results section ── -->

    <!-- Default: no filter active -->
    <div v-if="!hasAnySelection" class="cats-results">
      <div class="cats-results-rule">
        <span class="cats-results-rule__label">
          最新文章
          <span v-if="defaultArticles.length" class="cats-results-rule__count">{{ defaultArticles.length }}</span>
        </span>
      </div>

      <div v-if="contentStore.loading" class="grid gap-3 lg:grid-cols-2">
        <div v-for="i in 4" :key="i" class="cats-skel" style="height: 8rem; border-radius: 8px" />
      </div>
      <TransitionGroup
        v-else-if="pagedDefaultArticles.length"
        name="card-list"
        tag="div"
        class="grid gap-3 lg:grid-cols-2"
      >
        <ArticleCard v-for="article in pagedDefaultArticles" :key="article.id" :article="article" />
      </TransitionGroup>
      <p v-else-if="!contentStore.loading" class="text-sm" style="color:rgba(16,20,26,0.42)">暂无文章</p>

      <div v-if="totalDefaultPages > 1" class="cats-pager">
        <button class="cats-pager__arrow focus-ring" :disabled="currentPage <= 1" @click="currentPage--">←</button>
        <button
          v-for="p in totalDefaultPages"
          :key="p"
          class="cats-pager__page focus-ring"
          :class="{ 'cats-pager__page--active': p === currentPage }"
          @click="currentPage = p"
        >{{ p }}</button>
        <button class="cats-pager__arrow focus-ring" :disabled="currentPage >= totalDefaultPages" @click="currentPage++">→</button>
      </div>
    </div>

    <!-- Filtered results -->
    <div v-else ref="articlesSection" class="cats-results scroll-mt-24">
      <div class="cats-results-rule">
        <span class="cats-results-rule__label">
          筛选结果
          <span class="cats-results-rule__count">{{ totalFilteredCount }}</span>
        </span>
      </div>

      <!-- Filter summary -->
      <div class="cats-filter-summary">
        <template v-for="(name, i) in selectedCatNames.slice(0, 3)" :key="`cs${i}`">
          <span v-if="i > 0" style="opacity:0.3">·</span>
          <span class="cats-filter-summary__cat">{{ name }}</span>
        </template>
        <span v-if="selectedCatNames.length > 3" style="font-size:0.76rem;opacity:0.5">+{{ selectedCatNames.length - 3 }}</span>
        <span v-if="hasCatSelection && hasTagSelection" style="opacity:0.3;margin-inline:2px">→</span>
        <span
          v-for="(name, i) in selectedTagNames.slice(0, 5)"
          :key="`ts${i}`"
          class="cats-filter-summary__tag"
        >#{{ name }}</span>
        <span v-if="selectedTagNames.length > 5" style="font-size:0.76rem;opacity:0.5">+{{ selectedTagNames.length - 5 }}</span>
        <span
          v-if="tagFilterMode === 'and' && hasTagSelection && selectedTagIds.size > 1"
          class="cats-filter-summary__mode-badge"
        >全部匹配</span>
        <span style="margin-left:auto;font-size:0.8rem;opacity:0.55">共 <strong style="opacity:1;color:var(--ink)">{{ totalFilteredCount }}</strong> 篇</span>
      </div>

      <div v-if="contentStore.loading" class="grid gap-3 lg:grid-cols-2">
        <div v-for="i in 4" :key="i" class="cats-skel" style="height: 8rem; border-radius: 8px" />
      </div>
      <TransitionGroup
        v-else-if="pagedFilteredArticles.length"
        name="card-list"
        tag="div"
        class="grid gap-3 lg:grid-cols-2"
      >
        <ArticleCard v-for="article in pagedFilteredArticles" :key="article.id" :article="article" />
      </TransitionGroup>
      <div v-else class="cats-no-result">
        <span>{{ hasTagSelection ? '没有符合所选筛选条件的文章' : '该分类下暂无公开文章' }}</span>
        <div class="cats-no-result__actions">
          <button v-if="hasTagSelection" class="cats-no-result__btn focus-ring" @click="clearTags">取消标签筛选</button>
          <button class="cats-no-result__btn cats-no-result__btn--danger focus-ring" @click="clearAll">清除全部</button>
        </div>
      </div>

      <div v-if="totalFilteredPages > 1" class="cats-pager">
        <button class="cats-pager__arrow focus-ring" :disabled="filteredPage <= 1" @click="filteredPage--">←</button>
        <button
          v-for="p in totalFilteredPages"
          :key="p"
          class="cats-pager__page focus-ring"
          :class="{ 'cats-pager__page--active': p === filteredPage }"
          @click="filteredPage = p"
        >{{ p }}</button>
        <button class="cats-pager__arrow focus-ring" :disabled="filteredPage >= totalFilteredPages" @click="filteredPage++">→</button>
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
