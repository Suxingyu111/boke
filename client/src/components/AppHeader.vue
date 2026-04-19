<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { useSiteStore } from "@/stores/site";
import { useAuthStore } from "@/stores/auth";
import { useI18nStore } from "@/stores/i18n";
import { useUserStore } from "@/stores/user";

const siteStore = useSiteStore();
const authStore = useAuthStore();
const i18nStore = useI18nStore();
const userStore = useUserStore();
const router = useRouter();
const { cycleTheme, themeIcon, themeLabel } = useTheme();
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
const allNavItems = [...primaryNavItems];

function closeUserMenu() {
  userMenuOpen.value = false;
}

function logout() {
  authStore.logout();
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
  searchOpen.value = false;
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
  <!-- Skip link -->
  <a
    class="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-3 focus:text-white"
    href="#main-content"
  >
    跳到正文
  </a>

  <header
    :class="[
      'sticky top-0 z-20 backdrop-blur-xl transition-all duration-300',
      scrolled
        ? 'border-b border-line/90 bg-surface/97 shadow-[0_6px_28px_rgba(16,20,26,0.10)]'
        : 'border-b border-line/50 bg-surface/85',
    ]"
  >
    <!-- Animated accent stripe -->
    <div class="accent-stripe" aria-hidden="true"></div>

    <!-- Header bar: logo left, nav absolutely centered, actions right -->
    <div
      :class="[
        'header-bar relative flex items-center px-4 xl:px-8',
        'transition-[height] duration-300',
        scrolled ? 'h-14' : 'h-16',
      ]"
    >
      <!-- ① Logo -->
      <RouterLink class="focus-ring group flex-shrink-0 rounded-sm" to="/">
        <div class="flex items-center gap-2.5">
          <!-- Geometric mark -->
          <div class="logo-mark" aria-hidden="true">
            <span class="logo-sq logo-sq--a"></span>
            <span class="logo-sq logo-sq--b"></span>
            <span class="logo-sq logo-sq--c"></span>
            <span class="logo-sq logo-sq--d"></span>
          </div>
          <div>
            <span class="block font-display text-[1.6rem] leading-none text-ink tracking-tight">
              {{ siteStore.settings.title }}
            </span>
            <span class="mt-0.5 block text-[9px] uppercase tracking-[0.18em] text-brand/55 transition-colors duration-200 group-hover:text-coral/70">
              CODE · ESSAY · NOTES
            </span>
          </div>
        </div>
      </RouterLink>

      <!-- ② Nav — absolutely centered, never affected by side widths -->
      <nav class="nav-center" aria-label="主导航">
        <RouterLink
          v-for="item in allNavItems"
          :key="item.to"
          :class="['nav-pill focus-ring', item.to === '/guestbook' && 'nav-pill--guestbook']"
          active-class="nav-pill--active"
          :to="item.to"
        >
          <svg v-if="item.to === '/guestbook'" class="nav-pill__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 10.667A1.333 1.333 0 0112.667 12H4L1.333 14.667V2.667A1.333 1.333 0 012.667 1.333h10A1.333 1.333 0 0114 2.667v8z"/>
          </svg>
          {{ i18nStore.t(item.labelKey) }}
          <span v-if="item.to === '/guestbook'" class="nav-pill__invite" aria-hidden="true"></span>
        </RouterLink>
      </nav>

      <!-- ③ Right Actions -->
      <div class="ml-auto flex flex-shrink-0 items-center gap-1">
        <!-- Search: icon when closed, inline form when open -->
        <Transition name="search-expand">
          <form
            v-if="searchOpen"
            class="search-inline"
            role="search"
            @submit.prevent="submitSearch"
            @keydown.escape="closeSearch"
          >
            <label class="sr-only" for="site-search">搜索文章</label>
            <svg class="search-inline-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input
              id="site-search"
              ref="searchInputRef"
              v-model="searchTerm"
              class="search-inline-input"
              placeholder="搜索文章…"
              type="search"
              autocomplete="off"
            />
            <button
              class="search-inline-close focus-ring"
              type="button"
              aria-label="关闭搜索"
              @click="closeSearch"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </form>
          <button
            v-else
            class="action-icon-btn focus-ring"
            type="button"
            aria-label="搜索"
            @click="openSearch"
          >
            <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
          </button>
        </Transition>

        <button
          class="action-icon-btn focus-ring"
          type="button"
          :aria-label="`切换主题，当前：${themeLabel}`"
          :title="`切换主题，当前：${themeLabel}`"
          @click="cycleTheme"
        >
          <span class="text-base leading-none">{{ themeIcon }}</span>
        </button>

        <!-- Unauthenticated: Login + Register (desktop only) -->
        <template v-if="!authStore.isAuthenticated">
          <RouterLink
            class="focus-ring ui-button-secondary hidden h-9 min-h-0 px-4 text-sm lg:inline-flex"
            to="/login"
          >
            {{ i18nStore.t("site.login") }}
          </RouterLink>
          <RouterLink
            class="focus-ring ui-button-primary hidden h-9 min-h-0 px-4 text-sm lg:inline-flex"
            to="/register"
          >
            {{ i18nStore.t("site.register") }}
          </RouterLink>
        </template>

        <!-- Authenticated: Avatar with dropdown -->
        <div v-if="authStore.isAuthenticated" ref="userMenuRef" class="relative hidden lg:block">
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
            <!-- Unread notification dot -->
            <span v-if="userStore.unreadCount" class="unread-dot" aria-hidden="true"></span>
          </button>

          <Transition name="user-menu">
            <div v-if="userMenuOpen" class="user-dropdown" role="menu">
              <div class="dropdown-header">
                <p class="truncate text-sm font-semibold text-ink">{{ authStore.displayName }}</p>
                <p v-if="userStore.unreadCount" class="mt-0.5 text-xs text-brand">
                  {{ userStore.unreadCount }} 条未读通知
                </p>
              </div>
              <RouterLink class="dropdown-item" to="/profile" role="menuitem" @click="closeUserMenu">
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
                class="dropdown-item dropdown-item--danger w-full"
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
    </div>
  </header>
</template>

<style scoped>
/* ─── Accent stripe ─────────────────────────────────────────── */
.accent-stripe {
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    #1f4d6d 20%,
    #c96b34 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: stripe-flow 6s linear infinite;
}
@keyframes stripe-flow {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* ─── Logo geometric mark ────────────────────────────────────── */
.logo-mark {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  transition: transform 300ms ease;
}
.logo-mark:hover { transform: rotate(90deg); }
.logo-sq {
  border-radius: 2px;
  display: block;
}
.logo-sq--a { background: #1f4d6d; }
.logo-sq--b { background: rgba(31,77,109,0.35); }
.logo-sq--c { background: rgba(201,107,52,0.55); }
.logo-sq--d { background: #1f4d6d; }

/* ─── Nav center (absolute, decoupled from side widths) ─────── */
.nav-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 2px;
  /* prevent nav from overlapping logo/actions on very small screens */
  max-width: calc(100% - 320px);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  pointer-events: none; /* container itself non-interactive */
}
.nav-center::-webkit-scrollbar { display: none; }
/* re-enable pointer events on the actual links */
.nav-center > * { pointer-events: auto; }

/* ─── Nav pill (desktop) ─────────────────────────────────────── */
.nav-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border-radius: 99px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(16, 20, 26, 0.58);
  white-space: nowrap;
  transition: color 160ms ease, background 160ms ease;
}
.nav-pill:hover {
  color: #1f4d6d;
  background: rgba(31, 77, 109, 0.07);
}
.nav-pill--active {
  color: #1f4d6d;
  background: rgba(31, 77, 109, 0.10);
}
/* Subtle dot indicator for active item */
.nav-pill--active::before {
  content: '';
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #c96b34;
}

/* ─── Guestbook accent pill ─────────────────────────────────── */
.nav-pill--guestbook {
  gap: 5px;
}
.nav-pill__icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  opacity: 0.42;
  transition: opacity 160ms;
}
.nav-pill--guestbook:hover .nav-pill__icon,
.nav-pill--guestbook.nav-pill--active .nav-pill__icon {
  opacity: 1;
}
.nav-pill--guestbook:hover {
  color: #c96b34;
  background: rgba(201, 107, 52, 0.07);
}
.nav-pill--guestbook.nav-pill--active {
  color: #c96b34;
  background: rgba(201, 107, 52, 0.10);
}
/* The ::before dot still shows in coral – matches perfectly */
.nav-pill__invite {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c96b34;
  flex-shrink: 0;
  align-self: center;
  opacity: 0.65;
  animation: invite-pulse 2.8s ease-in-out infinite;
}
@keyframes invite-pulse {
  0%, 100% { transform: scale(1);   opacity: 0.65; }
  50%       { transform: scale(1.7); opacity: 0.22; }
}
/* Hide the invite dot when already on guestbook page */
.nav-pill--guestbook.nav-pill--active .nav-pill__invite {
  display: none;
}

/* ─── Action icon button ─────────────────────────────────────── */
.action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: rgba(16, 20, 26, 0.55);
  transition: color 160ms ease, background 160ms ease;
}
.action-icon-btn:hover {
  color: #1f4d6d;
  background: rgba(31, 77, 109, 0.08);
}

/* ─── Inline search ──────────────────────────────────────────── */
.search-inline {
  display: flex;
  align-items: center;
  gap: 0;
  height: 36px;
  border: 1.5px solid rgba(31, 77, 109, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  padding: 0 6px 0 10px;
  transition: border-color 160ms, box-shadow 160ms;
}
.search-inline:focus-within {
  border-color: #1f4d6d;
  box-shadow: 0 0 0 3px rgba(31, 77, 109, 0.10);
}
.search-inline-icon {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  color: rgba(16, 20, 26, 0.38);
  margin-right: 6px;
}
.search-inline-input {
  width: 160px;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: #10141a;
  outline: none;
  min-width: 0;
}
@media (min-width: 1280px) {
  .search-inline-input { width: 200px; }
}
.search-inline-input::placeholder {
  color: rgba(16, 20, 26, 0.35);
}
.search-inline-input::-webkit-search-cancel-button { display: none; }
.search-inline-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  color: rgba(16, 20, 26, 0.38);
  margin-left: 2px;
  transition: background 130ms, color 130ms;
}
.search-inline-close:hover {
  background: rgba(16, 20, 26, 0.07);
  color: rgba(16, 20, 26, 0.70);
}

/* Search expand/collapse transition */
.search-expand-enter-active {
  transition: opacity 180ms ease, transform 200ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.search-expand-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}
.search-expand-enter-from,
.search-expand-leave-to {
  opacity: 0;
  transform: scaleX(0.8);
  transform-origin: right center;
}

/* ─── Avatar button ──────────────────────────────────────────── */
.avatar-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: visible;
  border: 2px solid rgba(16, 20, 26, 0.14);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.avatar-btn > img,
.avatar-btn > svg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: block;
}
.avatar-btn:hover {
  border-color: rgba(31, 77, 109, 0.45);
  box-shadow: 0 0 0 3px rgba(31, 77, 109, 0.12);
  transform: scale(1.05);
}

/* Unread notification dot */
.unread-dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid white;
  animation: dot-pulse 2s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50%       { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
}

/* ─── Dropdown ───────────────────────────────────────────────── */
.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  width: 12rem;
  border: 1px solid rgba(16, 20, 26, 0.10);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 48px rgba(16, 20, 26, 0.14), 0 1px 3px rgba(16, 20, 26, 0.06);
  backdrop-filter: blur(16px);
  z-index: 50;
  overflow: hidden;
}
.dropdown-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(16, 20, 26, 0.08);
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  color: rgba(16, 20, 26, 0.70);
  transition: background 130ms, color 130ms;
  text-align: left;
}
.dropdown-item:hover {
  background: rgba(31, 77, 109, 0.06);
  color: #1f4d6d;
}
.dropdown-item--danger {
  border-top: 1px solid rgba(16, 20, 26, 0.06);
  margin-top: 2px;
}
.dropdown-item--danger:hover {
  background: rgba(220, 38, 38, 0.06);
  color: #dc2626;
}
.user-menu-enter-active,
.user-menu-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.user-menu-enter-from,
.user-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

</style>
