<script setup lang="ts">
import { listArticles } from "@/services/blog";

const articles = listArticles();
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm text-coral">Articles</p>
        <h1 class="mt-2 font-display text-5xl">文章管理</h1>
      </div>
      <button
        class="focus-ring rounded-md bg-ink px-4 py-3 text-paper hover:bg-moss"
        type="button"
      >
        新建文章
      </button>
    </div>

    <div class="mt-8 overflow-x-auto border border-line bg-white">
      <table class="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead class="bg-paper text-ink/60">
          <tr>
            <th class="p-4 font-medium">标题</th>
            <th class="p-4 font-medium">分类</th>
            <th class="p-4 font-medium">状态</th>
            <th class="p-4 font-medium">阅读</th>
            <th class="p-4 font-medium">发布时间</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="article in articles" :key="article.id">
            <td class="p-4 font-semibold">{{ article.title }}</td>
            <td class="p-4">{{ article.category.name }}</td>
            <td class="p-4">{{ article.status }}</td>
            <td class="p-4">{{ article.viewCount }}</td>
            <td class="p-4">
              {{ new Date(article.publishedAt).toLocaleDateString("zh-CN") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
