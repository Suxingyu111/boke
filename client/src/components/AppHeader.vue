<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
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
const searchOpen = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const userMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const scrolled = ref(false);

function handleScroll() {
  scrolled.value = window.scrollY > 6;
}

const primaryNavItems = [
  { labelKey: "site.home", to: "/" },
  { labelKey: "site.categories", to: "/categories" },
  { labelKey: "site.archives", to: "/archives" },
  { labelKey: "site.about", to: "/about" },
  { labelKey: "site.guestbook", to: "/guestbook" },
];
const secondaryNavItems: { labelKey: string; to: string }[] = [];
const allNavItems = [...primaryNavItems];

function closeMenu() {
  isOpen.value = false;
}

function closeUserMenu() {
  userMenuOpen.value = false;
}

function logout() {
  authStore.logout();
  closeMenu();
  closeUserMenu();
}

function handleClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    userMenuOpen.value = false;
  }
}

async function openSearch() {
  searchOpen.value = true;
  await nextTick();
  searchInputRef.value?.focus();
}

function closeSearch() {
  searchOpen.value = false;
  searchTerm.value = "";
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
  document.addEventListener("click", handleClickOutside);
  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("scroll", handleScroll);
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
    :class="[
      'sticky top-0 z-20 backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-250',
      scrolled
        ? 'border-b border-line/90 bg-surface/97 shadow-[0_4px_24px_rgba(16,20,26,0.09)]'
        : 'border-b border-line/60 bg-surface/82'
    ]"
  >
    <!-- Top accent stripe -->
    <div class="h-[2px] bg-gradient-to-r from-brand/0 via-brand to-coral/80" aria-hidden="true"></div>
    <!-- Desktop / full-width bar -->
    <div class="header-bar flex min-h-16 w-full items-center gap-2 px-4 xl:px-6">
      <!-- Logo -->
      <RouterLink class="focus-ring group mr-3 flex-shrink-0 rounded-md" to="/">
        <div class="relative">
          <span class="block font-display text-3xl leading-none text-ink">
            {{ siteStore.settings.title }}
          </span>
          <span class="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-brand/70">
            CODE / ESSAY / NOTES
          </span>
          <span
            class="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r from-brand to-coral transition-all duration-300 group-hover:w-full"
          ></span>
        </div>
      </RouterLink>

      <!-- Desktop Nav – left area, scrollable so items never squish -->
      <nav class="nav-scroll hidden flex-1 items-center gap-0.5 lg:flex" aria-label="主导航">
        <RouterLink
          v-for="item in allNavItems"
          :key="item.to"
          class="nav-link focus-ring flex-shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-ink/65 hover:text-brand"
          active-class="nav-link--active"
          :to="item.to"
        >
          {{ i18nStore.t(item.labelKey) }}
        </RouterLink>
      </nav>

      <!-- Desktop Right Actions – never shrink -->
      <div class="hidden flex-shrink-0 items-center gap-2 lg:flex">
        <!-- Search (icon → expanded form) -->
        <template v-if="!searchOpen">
          <button
            class="focus-ring flex h-9 w-9 items-center justify-center rounded-md text-ink/60 hover:bg-white/80 hover:text-ink"
            type="button"
            aria-label="搜索"
            @click="openSearch"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
          </button>
        </template>
        <form
          v-else
          class="flex items-center gap-1"
          role="search"
          @submit.prevent="submitSearch"
          @keydown.escape="closeSearch"
        >
          <label class="sr-only" for="site-search">搜索文章</label>
          <input
            id="site-search"
            ref="searchInputRef"
            v-model="searchTerm"
            class="focus-ring h-9 w-40 rounded-md border border-line bg-white/92 px-3 text-sm xl:w-52"
            placeholder="搜索文章…"
            type="search"
          />
          <button class="focus-ring ui-button-secondary h-9 min-h-0 px-3 text-sm" type="submit">搜索</button>
          <button
            class="focus-ring flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-white/80 hover:text-ink"
            type="button"
            aria-label="关闭搜索"
            @click="closeSearch"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>

        <!-- Language switch (globe icon) -->
        <button
          class="focus-ring flex h-9 w-9 items-center justify-center rounded-md text-ink/60 hover:bg-white/80 hover:text-ink"
          type="button"
          :title="i18nStore.locale === 'zh-CN' ? 'Switch to English' : '切换到中文'"
          @click="switchLocale"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- Unauthenticated: Login + Register -->
        <template v-if="!authStore.isAuthenticated">
          <RouterLink
            class="focus-ring ui-button-secondary h-9 min-h-0 px-4 text-sm"
            to="/login"
          >
            {{ i18nStore.t("site.login") }}
          </RouterLink>
          <RouterLink
            class="focus-ring ui-button-primary h-9 min-h-0 px-4 text-sm"
            to="/register"
          >
            {{ i18nStore.t("site.register") }}
          </RouterLink>
        </template>

        <!-- Authenticated: Avatar with dropdown -->
        <div v-else ref="userMenuRef" class="relative">
          <button
            class="avatar-btn focus-ring"
            type="button"
            :aria-expanded="userMenuOpen"
            aria-label="用户菜单"
            @click="userMenuOpen = !userMenuOpen"
          >
            <img
              v-if="authStore.user?.avatar"
              :src="authStore.user.avatar"
              :alt="authStore.displayName"
              class="h-full w-full object-cover"
            />
            <!-- Default cartoon avatar -->
            <svg v-else viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" class="h-full w-full">
              <rect width="40" height="40" fill="#dce8f0" />
              <circle cx="20" cy="14" r="8.5" fill="#1f4d6d" />
              <circle cx="17" cy="12.5" r="1.8" fill="white" />
              <circle cx="23" cy="12.5" r="1.8" fill="white" />
              <circle cx="17.6" cy="13" r="1" fill="#0f2d45" />
              <circle cx="23.6" cy="13" r="1" fill="#0f2d45" />
              <circle cx="17.2" cy="12.2" r="0.4" fill="white" />
              <circle cx="23.2" cy="12.2" r="0.4" fill="white" />
              <circle cx="13.8" cy="15" r="2.2" fill="rgba(220,80,80,0.22)" />
              <circle cx="26.2" cy="15" r="2.2" fill="rgba(220,80,80,0.22)" />
              <path d="M16.5 17 Q20 20.5 23.5 17" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none" />
              <ellipse cx="20" cy="37.5" rx="13.5" ry="7.5" fill="#1f4d6d" />
            </svg>
          </button>

          <!-- Dropdown menu -->
          <Transition name="user-menu">
            <div
              v-if="userMenuOpen"
              class="user-dropdown"
              role="menu"
            >
              <div class="border-b border-line px-4 py-3">
                <p class="truncate text-sm font-semibold text-ink">{{ authStore.displayName }}</p>
                <p v-if="userStore.unreadCount" class="mt-0.5 text-xs text-brand">
                  {{ userStore.unreadCount }} 条未读通知
                </p>
              </div>
              <RouterLink
                class="dropdown-item"
                to="/profile"
                role="menuitem"
                @click="closeUserMenu"
              >
                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                个人中心
              </RouterLink>
              <RouterLink
                v-if="authStore.canAccessAdmin"
                class="dropdown-item"
                to="/admin"
                role="menuitem"
                @click="closeUserMenu"
              >
                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                管理后台
              </RouterLink>
              <button
                class="dropdown-item dropdown-item--danger w-full border-t border-line/50"
                type="button"
                role="menuitem"
                @click="logout"
              >
                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Mobile menu toggle -->
      <button
        class="focus-ring ui-button-secondary ml-auto px-3 py-1.5 text-sm lg:hidden"
        :aria-expanded="isOpen"
        aria-label="打开或关闭导航菜单"
        type="button"
        @click="isOpen = !isOpen"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path v-if="isOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <!-- Mobile Nav -->
    <nav
      v-if="isOpen"
      class="grid gap-2 border-t border-line/70 px-4 py-3 lg:hidden"
      aria-label="移动端导航"
    >
      <RouterLink
        v-for="item in allNavItems"
        :key="item.to"
        class="focus-ring min-h-11 rounded-md px-3 py-2 font-medium hover:bg-white/80"
        active-class="bg-white shadow-insetline"
        :to="item.to"
        @click="isOpen = false"
      >
        {{ i18nStore.t(item.labelKey) }}
      </RouterLink>
      <form class="grid gap-2" role="search" @submit.prevent="submitSearch">
        <label class="text-sm font-medium text-ink/65" for="mobile-site-search">搜索文章</label>
        <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="mobile-site-search"
            v-model="searchTerm"
            class="focus-ring min-h-11 w-full rounded-md border border-line bg-white/92 px-3 py-2"
            placeholder="输入标题或正文关键词"
            type="search"
          />
          <button class="focus-ring ui-button-secondary px-4 py-2" type="submit">搜索</button>
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

<style scoped>
/* Nav scroll – hide scrollbar but allow overflow */
.nav-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.nav-scroll::-webkit-scrollbar {
  display: none;
}

/* Animated nav underline indicator */
.nav-link {
  position: relative;
  transition: color 150ms ease;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 10px;
  right: 10px;
  height: 2px;
  background: linear-gradient(90deg, #1f4d6d, #c96b34);
  border-radius: 1px;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.nav-link:hover::after,
.nav-link--active::after {
  transform: scaleX(1);
}
.nav-link--active {
  color: #1f4d6d;
}

/* Avatar button */
.avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--line);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}
.avatar-btn:hover {
  border-color: rgba(31, 77, 109, 0.5);
  box-shadow: 0 0 0 3px rgba(31, 77, 109, 0.12);
}

/* Dropdown */
.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 11rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 40px rgba(16, 20, 26, 0.14);
  backdrop-filter: blur(12px);
  z-index: 50;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.875rem;
  color: rgba(16, 20, 26, 0.72);
  transition: background 140ms, color 140ms;
  text-align: left;
}
.dropdown-item:hover {
  background: rgba(31, 77, 109, 0.06);
  color: var(--brand);
}
.dropdown-item--danger:hover {
  background: rgba(220, 38, 38, 0.06);
  color: #dc2626;
}

/* Dropdown enter/leave transition */
.user-menu-enter-active,
.user-menu-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}
.user-menu-enter-from,
.user-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
