<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    currentPage: number;
    totalPages: number;
    total?: number;
    disabled?: boolean;
    summary?: string;
    ariaLabel?: string;
    showPageNumbers?: boolean;
    previousLabel?: string;
    nextLabel?: string;
  }>(),
  {
    total: undefined,
    disabled: false,
    summary: "",
    ariaLabel: "分页导航",
    showPageNumbers: false,
    previousLabel: "上一页",
    nextLabel: "下一页",
  },
);

const emit = defineEmits<{
  (e: "change", page: number): void;
}>();

const safeCurrentPage = computed(() =>
  Math.min(Math.max(1, props.currentPage), Math.max(1, props.totalPages)),
);
const safeTotalPages = computed(() => Math.max(1, props.totalPages));

const summaryText = computed(() => {
  if (props.summary) {
    return props.summary;
  }

  if (props.total !== undefined) {
    return `共 ${props.total} 项，第 ${safeCurrentPage.value} / ${safeTotalPages.value} 页`;
  }

  return `第 ${safeCurrentPage.value} / ${safeTotalPages.value} 页`;
});

const pageItems = computed(() => {
  if (!props.showPageNumbers || safeTotalPages.value <= 1) {
    return [] as Array<number | "ellipsis">;
  }

  const total = safeTotalPages.value;
  const current = safeCurrentPage.value;

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((left, right) => left - right);

  const items: Array<number | "ellipsis"> = [];
  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
});

function changePage(page: number) {
  if (props.disabled || page === safeCurrentPage.value) {
    return;
  }

  const nextPage = Math.min(Math.max(1, page), safeTotalPages.value);
  if (nextPage !== safeCurrentPage.value) {
    emit("change", nextPage);
  }
}
</script>

<template>
  <nav
    v-if="safeTotalPages > 1"
    class="flex flex-wrap items-center justify-between gap-3"
    :aria-label="ariaLabel"
  >
    <p class="text-sm text-ink/55">
      {{ summaryText }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="focus-ring ui-button-secondary px-3 py-2 text-sm disabled:opacity-50"
        :disabled="disabled || safeCurrentPage === 1"
        type="button"
        @click="changePage(safeCurrentPage - 1)"
      >
        {{ previousLabel }}
      </button>
      <template v-if="showPageNumbers">
        <template v-for="item in pageItems" :key="`page-${item}`">
          <span
            v-if="item === 'ellipsis'"
            class="px-1 text-sm text-ink/45"
            aria-hidden="true"
          >
            …
          </span>
          <button
            v-else
            class="focus-ring min-h-10 min-w-10 rounded-md border px-3 py-2 text-sm transition"
            :class="
              item === safeCurrentPage
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-white text-ink/68 hover:border-brand hover:text-brand'
            "
            :disabled="disabled"
            type="button"
            @click="changePage(item)"
          >
            {{ item }}
          </button>
        </template>
      </template>
      <button
        class="focus-ring ui-button-primary px-3 py-2 text-sm disabled:opacity-50"
        :disabled="disabled || safeCurrentPage === safeTotalPages"
        type="button"
        @click="changePage(safeCurrentPage + 1)"
      >
        {{ nextLabel }}
      </button>
    </div>
  </nav>
</template>
