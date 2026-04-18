<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import { useEcosystemStore } from "@/stores/ecosystem";

const ecosystemStore = useEcosystemStore();
const route = useRoute();
const router = useRouter();

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
const selectedLabel = computed(() => {
  if (!ecosystemStore.selectedArchive) {
    return "";
  }

  return `${ecosystemStore.selectedArchive.year} 年 ${ecosystemStore.selectedArchive.month} 月`;
});

async function selectArchive(year: number, month: number) {
  await router.replace({
    name: "archives",
    query: { year: String(year), month: String(month) },
  });
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
    await ecosystemStore.loadArchiveArticles(
      availableSelection.year,
      availableSelection.month,
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
  <section class="content-shell py-10 md:py-14">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Archives</p>
        <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">
          文章归档
        </h1>
        <p class="mt-4 max-w-2xl leading-7 text-ink/66">
          按年月回看已经发布的文章，把零散更新重新拼成一条清晰时间线。
        </p>
      </div>
      <div class="ui-surface-soft px-4 py-3 text-sm text-ink/58">
        共
        {{ ecosystemStore.archiveMonths.reduce((sum, item) => sum + item.count, 0) }}
        篇文章
      </div>
    </div>

    <p
      v-if="ecosystemStore.errorMessage"
      class="mt-6 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ ecosystemStore.errorMessage }}
    </p>

    <div class="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="ui-surface-soft h-fit p-5">
        <div
          v-for="group in archiveGroups"
          :key="group.year"
          class="border-b border-line/70 pb-5 last:border-b-0 last:pb-0"
        >
          <h2 class="font-display text-3xl text-brand">{{ group.year }}</h2>
          <div class="mt-4 grid gap-2">
            <button
              v-for="item in group.items"
              :key="item.key"
              class="focus-ring archive-month-button"
              :class="{
                'archive-month-button--active':
                  selectedYear === item.year && selectedMonth === item.month,
              }"
              type="button"
              @click="selectArchive(item.year, item.month)"
            >
              <span>{{ item.month }} 月</span>
              <span>{{ item.count }} 篇</span>
            </button>
          </div>
        </div>
      </aside>

      <section class="grid gap-4">
        <div v-if="ecosystemStore.loading" class="ui-surface p-6">
          <div class="h-4 w-28 rounded-md bg-line animate-pulse"></div>
          <div class="mt-5 grid gap-3">
            <div
              v-for="index in 3"
              :key="index"
              class="h-24 rounded-md bg-line/50 animate-pulse"
            ></div>
          </div>
        </div>

        <template v-else-if="ecosystemStore.selectedArchive">
          <div class="ui-surface p-6">
            <p class="eyebrow">Selected</p>
            <h2 class="mt-2 font-display text-4xl text-brand">
              {{ selectedLabel }}
            </h2>
            <p class="mt-3 text-sm text-ink/58">
              {{ ecosystemStore.selectedArchive.articles.length }} 篇文章
            </p>
          </div>

          <article
            v-for="article in ecosystemStore.selectedArchive.articles"
            :key="article.id"
            class="ui-surface ui-hover-lift grid gap-4 p-5 md:grid-cols-[180px_minmax(0,1fr)]"
          >
            <RouterLink
              class="block aspect-[4/3] overflow-hidden rounded-md bg-line/30"
              :to="`/articles/${article.slug}`"
            >
              <img
                v-if="article.coverImage"
                class="h-full w-full object-cover"
                :alt="article.title"
                :src="article.coverImage"
                width="720"
                height="540"
                loading="lazy"
              />
              <div
                v-else
                class="grid h-full place-items-center bg-white text-sm text-ink/45"
              >
                无封面
              </div>
            </RouterLink>

            <div>
              <p class="text-sm text-ink/48">
                {{ new Date(article.publishedAt).toLocaleDateString("zh-CN") }}
              </p>
              <RouterLink
                class="focus-ring mt-2 inline-block rounded-md"
                :to="`/articles/${article.slug}`"
              >
                <h3 class="font-display text-4xl leading-tight text-brand">
                  {{ article.title }}
                </h3>
              </RouterLink>
              <p class="mt-3 leading-7 text-ink/66">
                {{ article.excerpt || "这篇文章还没有摘要。" }}
              </p>
            </div>
          </article>

          <div
            v-if="!ecosystemStore.selectedArchive.articles.length"
            class="ui-surface p-6 text-ink/60"
          >
            当前月份暂无公开文章。
          </div>
        </template>
      </section>
    </div>
  </section>
</template>
