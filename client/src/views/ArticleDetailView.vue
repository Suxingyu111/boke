<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { getArticleBySlug } from "@/services/blog";

const route = useRoute();
const article = computed(() => getArticleBySlug(String(route.params.slug)));
</script>

<template>
  <article v-if="article" class="bg-white">
    <header class="border-b border-line">
      <div
        class="content-shell grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end"
      >
        <div>
          <RouterLink class="focus-ring rounded-md text-sm text-coral" to="/"
            >返回首页</RouterLink
          >
          <h1 class="mt-6 font-display text-5xl leading-tight md:text-6xl">
            {{ article.title }}
          </h1>
          <p class="mt-5 max-w-2xl text-lg text-ink/70">
            {{ article.excerpt }}
          </p>
          <div class="mt-6 flex flex-wrap gap-3 text-sm text-ink/60">
            <span>{{ article.author.nickname }}</span>
            <span>{{
              new Date(article.publishedAt).toLocaleDateString("zh-CN")
            }}</span>
            <span>{{ article.viewCount }} 阅读</span>
            <span>{{ article.likes }} 喜欢</span>
          </div>
        </div>

        <img
          class="h-80 w-full rounded-md object-cover"
          :alt="article.title"
          :src="article.coverImage"
        />
      </div>
    </header>

    <div
      class="content-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,760px)_240px]"
    >
      <div class="prose max-w-none">
        <p class="text-lg leading-8 text-ink/80">{{ article.content }}</p>
        <h2 class="mt-10 font-display text-3xl">下一步</h2>
        <p class="mt-4 leading-8 text-ink/75">
          接入真实文章接口后，这里可以渲染
          Markdown、代码高亮、目录锚点和阅读进度。
        </p>
      </div>

      <aside class="h-fit border border-line bg-paper p-5">
        <p class="font-display text-2xl">分类</p>
        <p class="mt-2" :style="{ color: article.category.color }">
          {{ article.category.name }}
        </p>
        <p class="mt-6 font-display text-2xl">标签</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <RouterLink
            v-for="tag in article.tags"
            :key="tag.id"
            class="focus-ring rounded-md bg-white px-2 py-1 text-sm"
            :to="`/tags?tag=${tag.slug}`"
          >
            #{{ tag.name }}
          </RouterLink>
        </div>
      </aside>
    </div>
  </article>

  <section v-else class="content-shell py-20">
    <h1 class="font-display text-5xl">文章不存在</h1>
    <RouterLink
      class="focus-ring mt-6 inline-block rounded-md bg-ink px-4 py-2 text-paper"
      to="/"
    >
      回到首页
    </RouterLink>
  </section>
</template>
