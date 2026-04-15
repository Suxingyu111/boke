<script setup lang="ts">
import { ref } from "vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const isOpen = ref(false);

const navItems = [
  { label: "首页", to: "/" },
  { label: "分类", to: "/categories" },
  { label: "标签", to: "/tags" },
  { label: "搜索", to: "/search" },
  { label: "关于", to: "/about" },
  { label: "友链", to: "/links" },
];
</script>

<template>
  <header
    class="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur"
  >
    <div class="content-shell flex min-h-20 items-center justify-between gap-4">
      <RouterLink
        class="focus-ring rounded-md font-display text-3xl leading-none"
        to="/"
      >
        {{ siteStore.settings.title }}
      </RouterLink>

      <button
        class="focus-ring rounded-md border border-line px-3 py-2 text-sm md:hidden"
        type="button"
        @click="isOpen = !isOpen"
      >
        菜单
      </button>

      <nav class="hidden items-center gap-1 md:flex">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          class="focus-ring rounded-md px-3 py-2 text-sm hover:bg-white"
          :to="item.to"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink
          class="focus-ring ml-2 rounded-md bg-ink px-4 py-2 text-sm text-paper hover:bg-moss"
          to="/login"
        >
          管理入口
        </RouterLink>
      </nav>
    </div>

    <nav
      v-if="isOpen"
      class="content-shell grid gap-2 border-t border-line py-3 md:hidden"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        class="focus-ring rounded-md px-3 py-2 hover:bg-white"
        :to="item.to"
        @click="isOpen = false"
      >
        {{ item.label }}
      </RouterLink>
      <RouterLink
        class="focus-ring rounded-md bg-ink px-3 py-2 text-paper"
        to="/login"
        @click="isOpen = false"
      >
        管理入口
      </RouterLink>
    </nav>
  </header>
</template>
