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
          v-if="!authStore.isAuthenticated"
          class="focus-ring ml-2 rounded-md border border-line px-4 py-2 text-sm hover:border-coral hover:text-coral"
          to="/login"
        >
          登录
        </RouterLink>
        <RouterLink
          v-if="!authStore.isAuthenticated"
          class="focus-ring rounded-md bg-ink px-4 py-2 text-sm text-paper hover:bg-moss"
          to="/register"
        >
          注册
        </RouterLink>
        <RouterLink
          v-if="authStore.canAccessAdmin"
          class="focus-ring ml-2 rounded-md bg-ink px-4 py-2 text-sm text-paper hover:bg-moss"
          to="/admin"
        >
          后台
        </RouterLink>
        <button
          v-if="authStore.isAuthenticated"
          class="focus-ring rounded-md border border-line px-4 py-2 text-sm hover:border-coral hover:text-coral"
          type="button"
          @click="logout"
        >
          {{ authStore.displayName }} · 退出
        </button>
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
        v-if="!authStore.isAuthenticated"
        class="focus-ring rounded-md border border-line px-3 py-2"
        to="/login"
        @click="closeMenu"
      >
        登录
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="focus-ring rounded-md bg-ink px-3 py-2 text-paper"
        to="/register"
        @click="closeMenu"
      >
        注册
      </RouterLink>
      <RouterLink
        v-if="authStore.canAccessAdmin"
        class="focus-ring rounded-md bg-ink px-3 py-2 text-paper"
        to="/admin"
        @click="closeMenu"
      >
        后台
      </RouterLink>
      <button
        v-if="authStore.isAuthenticated"
        class="focus-ring rounded-md border border-line px-3 py-2 text-left"
        type="button"
        @click="logout"
      >
        {{ authStore.displayName }} · 退出
      </button>
    </nav>
  </header>
</template>
