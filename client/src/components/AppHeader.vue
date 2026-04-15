<script setup lang="ts">
import { ref } from "vue";
import { useSiteStore } from "@/stores/site";
import { useAuthStore } from "@/stores/auth";

const siteStore = useSiteStore();
const authStore = useAuthStore();
const isOpen = ref(false);

const navItems = [
  { label: "首页", to: "/" },
  { label: "分类", to: "/categories" },
  { label: "标签", to: "/tags" },
  { label: "搜索", to: "/search" },
  { label: "关于", to: "/about" },
  { label: "友链", to: "/links" },
];

function closeMenu() {
  isOpen.value = false;
}

function logout() {
  authStore.logout();
  closeMenu();
}
</script>

<template>
  <a
    class="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
    href="#main-content"
  >
    跳到正文
  </a>
  <header
    class="sticky top-0 z-20 border-b border-line/80 bg-paper/88 backdrop-blur-xl"
  >
    <div class="content-shell flex min-h-20 items-center justify-between gap-4">
      <RouterLink
        class="focus-ring group rounded-md font-display text-3xl leading-none"
        to="/"
      >
        <span
          class="inline-block transition-transform duration-200 group-hover:-translate-y-0.5"
        >
          {{ siteStore.settings.title }}
        </span>
      </RouterLink>

      <button
        class="focus-ring ui-button-secondary px-4 py-2 text-sm md:hidden"
        :aria-expanded="isOpen"
        aria-label="打开或关闭导航菜单"
        type="button"
        @click="isOpen = !isOpen"
      >
        菜单
      </button>

      <nav class="hidden items-center gap-1 md:flex">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          class="focus-ring rounded-md px-3 py-2 text-sm font-medium text-ink/68 hover:bg-white hover:text-ink"
          active-class="bg-white text-ink shadow-insetline"
          :to="item.to"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink
          v-if="!authStore.isAuthenticated"
          class="focus-ring ui-button-secondary ml-2 px-4 py-2 text-sm"
          to="/login"
        >
          登录
        </RouterLink>
        <RouterLink
          v-if="!authStore.isAuthenticated"
          class="focus-ring ui-button-primary px-4 py-2 text-sm"
          to="/register"
        >
          注册
        </RouterLink>
        <RouterLink
          v-if="authStore.canAccessAdmin"
          class="focus-ring ui-button-primary ml-2 px-4 py-2 text-sm"
          to="/admin"
        >
          后台
        </RouterLink>
        <button
          v-if="authStore.isAuthenticated"
          class="focus-ring ui-button-secondary px-4 py-2 text-sm"
          type="button"
          @click="logout"
        >
          {{ authStore.displayName }} · 退出
        </button>
      </nav>
    </div>

    <nav
      v-if="isOpen"
      class="content-shell grid gap-2 border-t border-line/80 py-3 md:hidden"
      aria-label="移动端导航"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        class="focus-ring min-h-11 rounded-md px-3 py-2 font-medium hover:bg-white"
        active-class="bg-white shadow-insetline"
        :to="item.to"
        @click="isOpen = false"
      >
        {{ item.label }}
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="focus-ring ui-button-secondary px-3 py-2"
        to="/login"
        @click="closeMenu"
      >
        登录
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="focus-ring ui-button-primary px-3 py-2"
        to="/register"
        @click="closeMenu"
      >
        注册
      </RouterLink>
      <RouterLink
        v-if="authStore.canAccessAdmin"
        class="focus-ring ui-button-primary px-3 py-2"
        to="/admin"
        @click="closeMenu"
      >
        后台
      </RouterLink>
      <button
        v-if="authStore.isAuthenticated"
        class="focus-ring ui-button-secondary px-3 py-2 text-left"
        type="button"
        @click="logout"
      >
        {{ authStore.displayName }} · 退出
      </button>
    </nav>
  </header>
</template>
