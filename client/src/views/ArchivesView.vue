<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import Pagination from "@/components/Pagination.vue";
import { useEcosystemStore } from "@/stores/ecosystem";

const ecosystemStore = useEcosystemStore();
const route = useRoute();
const router = useRouter();

const currentPage = ref(1);

/** 从 markdown 内容中提取前 N 行可读文本 */
function extractContentLines(content: string, lines = 3): string {
  return content
    .split("\n")
    .map(line => line.replace(/^#{1,6}\s+/, "").replace(/[*_`~>|\[\]]/g, "").trim())
    .filter(line => line.length > 0)
    .slice(0, lines)
    .join(" ");
}

const archiveGroups = computed(() => {
  const groups = new Map<
    number,
    Array<{ year: number; month: number; count: number; key: string }>
  >();

  for (const item of ecosystemStore.archiveMonths) {
    const yearItems = groups.get(item.year) ?? [];
    yearItems.push({
      ...item,
      key: `${item.year}-${item.month}`,
    });
    groups.set(item.year, yearItems);
  }

  return Array.from(groups.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([year, items]) => ({
      year,
      items: items.sort((left, right) => right.month - left.month),
    }));
});

const selectedYear = computed(() => Number(route.query.year || 0));
const selectedMonth = computed(() => Number(route.query.month || 0));

async function selectArchive(year: number, month: number) {
  currentPage.value = 1;
  await router.replace({
    name: "archives",
    query: { year: String(year), month: String(month) },
  });
}

async function goToPage(page: number) {
  currentPage.value = page;
  try {
    await ecosystemStore.loadArchiveArticles(selectedYear.value, selectedMonth.value, page);
  } catch (error) {
    ecosystemStore.errorMessage = getApiErrorMessage(error, "归档加载失败");
  }
}

async function ensureArchiveLoaded() {
  const hasArchiveSummary = ecosystemStore.archiveMonths.length > 0;
  if (!hasArchiveSummary) {
    await ecosystemStore.loadArchives();
  }

  const availableSelection =
    ecosystemStore.archiveMonths.find(
      (item) => item.year === selectedYear.value && item.month === selectedMonth.value,
    ) ?? ecosystemStore.archiveMonths[0];

  if (!availableSelection) {
    return;
  }

  if (
    selectedYear.value !== availableSelection.year ||
    selectedMonth.value !== availableSelection.month
  ) {
    await router.replace({
      name: "archives",
      query: {
        year: String(availableSelection.year),
        month: String(availableSelection.month),
      },
    });
    return;
  }

  if (
    ecosystemStore.selectedArchive?.year !== availableSelection.year ||
    ecosystemStore.selectedArchive?.month !== availableSelection.month
  ) {
    currentPage.value = 1;
    await ecosystemStore.loadArchiveArticles(
      availableSelection.year,
      availableSelection.month,
      1,
    );
  }
}

watch(
  () => [route.query.year, route.query.month],
  async () => {
    try {
      await ensureArchiveLoaded();
    } catch (error) {
      ecosystemStore.errorMessage = getApiErrorMessage(error, "归档加载失败");
    }
  },
);

onMounted(async () => {
  try {
    await ensureArchiveLoaded();
  } catch (error) {
    ecosystemStore.errorMessage = getApiErrorMessage(error, "归档加载失败");
  }
});
</script>

<template>
  <section class="content-shell archive-page">
    <p
      v-if="ecosystemStore.errorMessage"
      class="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      {{ ecosystemStore.errorMessage }}
    </p>

    <div class="archive-layout">
      <!-- ── Sidebar: timeline navigator ── -->
      <aside class="archive-nav">
        <div
          v-for="group in archiveGroups"
          :key="group.year"
          class="archive-nav__year-group"
        >
          <div class="archive-nav__year-label">{{ group.year }}</div>
          <div class="archive-nav__months">
            <button
              v-for="item in group.items"
              :key="item.key"
              class="archive-nav__month focus-ring"
              :class="{ 'archive-nav__month--active': selectedYear === item.year && selectedMonth === item.month }"
              type="button"
              @click="selectArchive(item.year, item.month)"
            >
              <span class="archive-nav__month-dot"></span>
              <span class="archive-nav__month-name">{{ item.month }} 月</span>
              <span class="archive-nav__month-count">{{ item.count }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- ── Main: article entries ── -->
      <main class="archive-content">
        <!-- Month header -->
        <header v-if="ecosystemStore.selectedArchive" class="archive-content__header">
          <p class="eyebrow">文章归档</p>
          <h2 class="archive-content__title">
            {{ ecosystemStore.selectedArchive.year }}年{{ ecosystemStore.selectedArchive.month }}月
          </h2>
          <span class="archive-content__total">
            共 {{ ecosystemStore.archivePagination.total }} 篇文章
          </span>
        </header>

        <!-- Loading skeleton -->
        <div v-if="ecosystemStore.loading" class="archive-entries">
          <div v-for="i in 6" :key="i" class="archive-skeleton-entry">
            <div class="archive-skeleton-block" style="width:2.8rem;height:3.2rem;border-radius:8px;flex-shrink:0"></div>
            <div style="flex:1;display:grid;gap:0.4rem">
              <div class="archive-skeleton-block" style="height:0.9rem;width:55%"></div>
              <div class="archive-skeleton-block" style="height:0.75rem;width:88%"></div>
              <div class="archive-skeleton-block" style="height:0.75rem;width:68%"></div>
            </div>
          </div>
        </div>

        <!-- Article entries -->
        <template v-else-if="ecosystemStore.selectedArchive">
          <div v-if="ecosystemStore.selectedArchive.articles.length" class="archive-entries">
            <article
              v-for="(article, index) in ecosystemStore.selectedArchive.articles"
              :key="article.id"
              class="archive-entry"
              :style="{ '--entry-index': index }"
            >
              <div class="archive-entry__date-badge">
                <span class="archive-entry__day">
                  {{ new Date(article.publishedAt).getDate() }}
                </span>
                <span class="archive-entry__month-abbr">
                  {{ new Date(article.publishedAt).getMonth() + 1 }}月
                </span>
              </div>
              <div class="archive-entry__body">
                <RouterLink
                  class="archive-entry__title-link focus-ring"
                  :to="`/articles/${article.slug}`"
                >
                  <h3 class="archive-entry__title">{{ article.title }}</h3>
                </RouterLink>
                <p class="archive-entry__excerpt">
                  {{ article.excerpt || extractContentLines(article.content || "") || "暂无内容预览。" }}
                </p>
                <div class="archive-entry__meta">
                  <RouterLink
                    class="archive-entry__read-link focus-ring"
                    :to="`/articles/${article.slug}`"
                  >阅读全文 →</RouterLink>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="archive-empty">当前月份暂无公开文章。</div>

          <!-- Pagination -->
          <Pagination
            v-if="ecosystemStore.archivePagination.totalPages > 1"
            :current-page="currentPage"
            :show-page-numbers="true"
            :total-pages="ecosystemStore.archivePagination.totalPages"
            @change="goToPage"
          />
        </template>
      </main>
    </div>
  </section>
</template>
