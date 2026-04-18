<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";
import { useAuthStore } from "@/stores/auth";
import { useI18nStore } from "@/stores/i18n";
import { useUserStore } from "@/stores/user";

const siteStore = useSiteStore();
const authStore = useAuthStore();
const i18nStore = useI18nStore();
const userStore = useUserStore();
const router = useRouter();
const isOpen = ref(false);
const searchTerm = ref("");

const navItems = [
  { labelKey: "site.home", to: "/" },
  { labelKey: "site.ecosystem", to: "/ecosystem" },
  { labelKey: "site.categories", to: "/categories" },
  { labelKey: "site.tags", to: "/tags" },
  { labelKey: "site.archives", to: "/archives" },
  { labelKey: "site.about", to: "/about" },
  { labelKey: "site.links", to: "/links" },
  { labelKey: "site.guestbook", to: "/guestbook" },
];

function closeMenu() {
  isOpen.value = false;
}

function logout() {
  authStore.logout();
  closeMenu();
}

async function submitSearch() {
  const keyword = searchTerm.value.trim();
  await router.push({
    name: "search",
    query: keyword ? { q: keyword } : {},
  });
  searchTerm.value = "";
  closeMenu();
}

async function switchLocale() {
  await i18nStore.switchLocale(
    i18nStore.locale === "zh-CN" ? "en-US" : "zh-CN",
  );
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    void userStore.loadUnreadCount();
  }
});

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      void userStore.loadUnreadCount();
    }
  },
);
</script>

<template>
  <a
    class="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-3 focus:text-white"
    href="#main-content"
  >
    跳到正文
  </a>
  <header
    class="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-xl"
  >
    <div class="content-shell flex min-h-20 items-center justify-between gap-4">
      <RouterLink class="focus-ring group rounded-md" to="/">
        <div class="relative">
          <span class="block font-display text-4xl leading-none text-ink">
            {{ siteStore.settings.title }}
          </span>
          <span class="mt-1 block text-xs tracking-[0.16em] text-brand/70">
            CODE / ESSAY / NOTES
          </span>
          <span
            class="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-brand to-coral transition-all duration-300 group-hover:w-full"
          ></span>
        </div>
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
          class="focus-ring rounded-md px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-white/80 hover:text-brand"
          active-class="bg-white text-brand shadow-insetline"
          :to="item.to"
        >
          {{ i18nStore.t(item.labelKey) }}
        </RouterLink>
        <form
          class="hidden items-center gap-2 lg:flex"
          role="search"
          @submit.prevent="submitSearch"
        >
          <label class="sr-only" for="site-search">搜索文章</label>
          <input
            id="site-search"
            v-model="searchTerm"
            class="focus-ring min-h-11 w-44 rounded-md border border-line bg-white/92 px-3 py-2 text-sm xl:w-56"
            placeholder="搜索标题或正文"
            type="search"
          />
          <button
            class="focus-ring ui-button-secondary px-3 py-2 text-sm"
            type="submit"
          >
            {{ i18nStore.t("site.search") }}
          </button>
        </form>
        <button
          class="focus-ring ui-button-secondary px-3 py-2 text-sm"
          type="button"
          @click="switchLocale"
        >
          {{ i18nStore.locale === "zh-CN" ? "EN" : "中文" }}
        </button>
        <RouterLink
          v-if="!authStore.isAuthenticated"
          class="focus-ring ui-button-secondary ml-2 px-4 py-2 text-sm"
          to="/login"
        >
          {{ i18nStore.t("site.login") }}
        </RouterLink>
        <RouterLink
          v-if="!authStore.isAuthenticated"
          class="focus-ring ui-button-primary px-4 py-2 text-sm"
          to="/register"
        >
          {{ i18nStore.t("site.register") }}
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          class="focus-ring ui-button-secondary ml-2 px-4 py-2 text-sm"
          to="/profile"
          @mouseenter="userStore.loadUnreadCount()"
        >
          {{ i18nStore.t("site.profile") }}
          <span v-if="userStore.unreadCount">({{ userStore.unreadCount }})</span>
        </RouterLink>
        <RouterLink
          v-if="authStore.canAccessAdmin"
          class="focus-ring ui-button-primary ml-2 px-4 py-2 text-sm"
          to="/admin"
        >
          {{ i18nStore.t("site.admin") }}
        </RouterLink>
        <button
          v-if="authStore.isAuthenticated"
          class="focus-ring ui-button-secondary px-4 py-2 text-sm"
          type="button"
          @click="logout"
        >
          {{ authStore.displayName }} · {{ i18nStore.t("site.logout") }}
        </button>
      </nav>
    </div>

    <nav
      v-if="isOpen"
      class="content-shell grid gap-2 border-t border-line/70 py-3 md:hidden"
      aria-label="移动端导航"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        class="focus-ring min-h-11 rounded-md px-3 py-2 font-medium hover:bg-white/80"
        active-class="bg-white shadow-insetline"
        :to="item.to"
        @click="isOpen = false"
      >
        {{ i18nStore.t(item.labelKey) }}
      </RouterLink>
      <form class="grid gap-2" role="search" @submit.prevent="submitSearch">
        <label class="text-sm font-medium text-ink/65" for="mobile-site-search">
          搜索文章
        </label>
        <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="mobile-site-search"
            v-model="searchTerm"
            class="focus-ring min-h-11 w-full rounded-md border border-line bg-white/92 px-3 py-2"
            placeholder="输入标题或正文关键词"
            type="search"
          />
          <button
            class="focus-ring ui-button-secondary px-4 py-2"
            type="submit"
          >
            搜索
          </button>
        </div>
      </form>
      <button
        class="focus-ring ui-button-secondary px-3 py-2 text-left"
        type="button"
        @click="switchLocale"
      >
        {{ i18nStore.locale === "zh-CN" ? "English" : "中文" }}
      </button>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="focus-ring ui-button-secondary px-3 py-2"
        to="/login"
        @click="closeMenu"
      >
        {{ i18nStore.t("site.login") }}
      </RouterLink>
      <RouterLink
        v-if="!authStore.isAuthenticated"
        class="focus-ring ui-button-primary px-3 py-2"
        to="/register"
        @click="closeMenu"
      >
        {{ i18nStore.t("site.register") }}
      </RouterLink>
      <RouterLink
        v-if="authStore.isAuthenticated"
        class="focus-ring ui-button-secondary px-3 py-2"
        to="/profile"
        @click="closeMenu"
      >
        {{ i18nStore.t("site.profile") }}
        <span v-if="userStore.unreadCount">({{ userStore.unreadCount }})</span>
      </RouterLink>
      <RouterLink
        v-if="authStore.canAccessAdmin"
        class="focus-ring ui-button-primary px-3 py-2"
        to="/admin"
        @click="closeMenu"
      >
        {{ i18nStore.t("site.admin") }}
      </RouterLink>
      <button
        v-if="authStore.isAuthenticated"
        class="focus-ring ui-button-secondary px-3 py-2 text-left"
        type="button"
        @click="logout"
      >
        {{ authStore.displayName }} · {{ i18nStore.t("site.logout") }}
      </button>
    </nav>
  </header>
</template>
