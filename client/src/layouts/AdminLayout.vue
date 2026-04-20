<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import { useAuthStore } from "@/stores/auth";
import { getDefaultAuthorizedRoute, hasMinimumRole } from "@/utils/permissions";

const authStore = useAuthStore();
const router = useRouter();
const { cycleTheme, themeIcon, themeLabel } = useTheme();
const managementHome = computed(() => getDefaultAuthorizedRoute(authStore.user));
const navigationItems = computed(() =>
  [
    { to: "/admin", label: "数据概览", minRole: "admin" as const },
    { to: "/admin/articles", label: "文章管理", minRole: "author" as const },
    { to: "/admin/comments", label: "评论管理", minRole: "admin" as const },
    { to: "/admin/pages", label: "页面管理", minRole: "admin" as const },
    { to: "/admin/settings", label: "系统设置", minRole: "admin" as const },
    { to: "/admin/technical", label: "技术增强", minRole: "admin" as const },
  ].filter((item) => hasMinimumRole(authStore.user, item.minRole)),
);

async function logout() {
  authStore.logout();
  await router.push("/login");
}
</script>

<template>
  <div
    class="min-h-screen bg-[linear-gradient(170deg,#0f2235_0%,#132f47_48%,#1c3d53_100%)] text-paper"
  >
    <div
      class="content-shell grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]"
    >
      <aside
        class="h-fit rounded-md border border-white/15 bg-white/[0.08] p-4 shadow-editorial backdrop-blur-xl lg:sticky lg:top-6"
      >
        <RouterLink class="block font-display text-3xl text-white" :to="managementHome">
          纸上码头
        </RouterLink>
        <p class="mt-2 text-sm text-white/70">
          {{ authStore.displayName || "后台管理" }}
        </p>

        <button
          class="focus-ring mt-5 min-h-11 w-full rounded-md border border-white/18 px-3 py-2 text-left text-sm text-white/78 hover:bg-white/12"
          type="button"
          @click="cycleTheme"
        >
          <span class="mr-2 inline-block w-5 text-center">{{ themeIcon }}</span>
          切换主题 · {{ themeLabel }}
        </button>

        <nav class="mt-8 grid gap-2 text-sm">
          <RouterLink
            v-for="item in navigationItems"
            :key="item.to"
            class="focus-ring min-h-11 rounded-md px-3 py-2 font-medium text-white/78 hover:bg-white/12 hover:text-white"
            active-class="bg-white text-brand"
            :to="item.to"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <button
          class="focus-ring mt-8 min-h-11 w-full rounded-md border border-white/22 px-3 py-2 text-left text-sm hover:bg-white/12"
          type="button"
          @click="logout"
        >
          退出登录
        </button>
      </aside>

      <section
        class="min-w-0 rounded-md border border-white/20 bg-paper/96 p-5 text-ink shadow-editorial md:p-8"
      >
        <RouterView />
      </section>
    </div>
  </div>
</template>
