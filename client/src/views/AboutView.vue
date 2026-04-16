<script setup lang="ts">
import { computed, onMounted } from "vue";
import { usePagesStore } from "@/stores/pages";
import { renderMarkdown } from "@/utils/markdown";

const pagesStore = usePagesStore();
const aboutPage = computed(() => pagesStore.aboutPage);
const renderedContent = computed(() =>
  aboutPage.value ? renderMarkdown(aboutPage.value.content) : "",
);

onMounted(() => {
  void pagesStore.loadAboutPage();
});
</script>

<template>
  <section
    class="content-shell grid gap-8 py-12 lg:grid-cols-[360px_minmax(0,1fr)]"
  >
    <div class="ui-surface ui-hover-lift overflow-hidden p-2">
      <img
        alt="书桌与笔记本"
        class="h-full min-h-80 w-full rounded-md object-cover"
        src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
      />
    </div>

    <div v-if="aboutPage" class="ui-surface p-6 md:p-8">
      <p class="eyebrow">About</p>
      <h1 class="mt-2 font-display text-5xl">{{ aboutPage.title }}</h1>
      <p
        v-if="aboutPage.summary"
        class="mt-6 max-w-2xl text-lg leading-8 text-ink/75"
      >
        {{ aboutPage.summary }}
      </p>
      <div class="markdown-body mt-8 max-w-3xl" v-html="renderedContent"></div>
    </div>

    <div v-else class="ui-surface p-6 md:p-8">
      <p class="eyebrow">About</p>
      <h1 class="mt-2 font-display text-5xl">关于我</h1>
      <div class="mt-6 grid gap-3 text-ink/65">
        <div class="h-4 w-2/3 rounded-md bg-line"></div>
        <div class="h-4 w-5/6 rounded-md bg-line"></div>
        <div class="h-4 w-1/2 rounded-md bg-line"></div>
      </div>
    </div>
  </section>
</template>
