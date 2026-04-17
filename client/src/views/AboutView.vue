<script setup lang="ts">
import { computed, onMounted } from "vue";
import { usePagesStore } from "@/stores/pages";
import { renderMarkdown } from "@/utils/markdown";

const pagesStore = usePagesStore();
const aboutPage = computed(() => pagesStore.aboutPage);
const renderedContent = computed(() =>
  aboutPage.value ? renderMarkdown(aboutPage.value.content) : "",
);

onMounted(async () => {
  await pagesStore.loadAboutPage();
});
</script>

<template>
  <section class="content-shell py-10 md:py-14">
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">About</p>
        <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">
          关于我
        </h1>
        <p class="mt-3 max-w-2xl leading-7 text-ink/66">
          记录写作、开发与产品思考的长期实验。
        </p>
      </div>
    </div>

    <div class="grid gap-7 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div class="ui-surface ui-hover-lift overflow-hidden p-2">
        <img
          alt="书桌与笔记本"
          class="h-full min-h-80 w-full rounded-[12px] object-cover"
          src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
          width="780"
          height="1040"
        />
      </div>

      <div v-if="aboutPage" class="ui-surface p-6 md:p-8">
        <h2 class="font-display text-4xl text-brand">{{ aboutPage.title }}</h2>
        <p
          v-if="aboutPage.summary"
          class="mt-5 max-w-2xl text-lg leading-8 text-ink/76"
        >
          {{ aboutPage.summary }}
        </p>
        <div
          class="markdown-body mt-8 max-w-3xl"
          v-html="renderedContent"
        ></div>
      </div>

      <div v-else-if="pagesStore.loading" class="ui-surface p-6 md:p-8">
        <h2 class="font-display text-4xl text-brand">关于页加载中</h2>
        <div class="mt-6 grid gap-3 text-ink/65">
          <div class="h-4 w-2/3 rounded-md bg-line"></div>
          <div class="h-4 w-5/6 rounded-md bg-line"></div>
          <div class="h-4 w-1/2 rounded-md bg-line"></div>
          <div class="h-40 rounded-md bg-line/60"></div>
        </div>
      </div>

      <div v-else class="ui-surface p-6 md:p-8">
        <h2 class="font-display text-4xl text-brand">关于页暂不可用</h2>
        <p class="mt-4 max-w-2xl leading-7 text-ink/65">
          {{ pagesStore.errorMessage || "还没有发布关于页，或接口请求失败。" }}
        </p>
      </div>
    </div>
  </section>
</template>
