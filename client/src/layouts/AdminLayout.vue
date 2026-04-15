<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

async function logout() {
  authStore.logout();
  await router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-ink text-paper">
    <div
      class="content-shell grid gap-6 py-6 lg:grid-cols-[240px_minmax(0,1fr)]"
    >
      <aside class="border border-white/15 bg-white/5 p-4">
        <RouterLink class="block font-display text-3xl" to="/"
          >纸上码头</RouterLink
        >
        <p class="mt-2 text-sm text-white/60">
          {{ authStore.displayName || "后台管理" }}
        </p>

        <nav class="mt-8 grid gap-2 text-sm">
          <RouterLink
            class="focus-ring rounded-md px-3 py-2 hover:bg-white/10"
            to="/admin"
          >
            数据概览
          </RouterLink>
          <RouterLink
            class="focus-ring rounded-md px-3 py-2 hover:bg-white/10"
            to="/admin/articles"
          >
            文章管理
          </RouterLink>
          <RouterLink
            class="focus-ring rounded-md px-3 py-2 hover:bg-white/10"
            to="/admin/settings"
          >
            系统设置
          </RouterLink>
        </nav>

        <button
          class="focus-ring mt-8 w-full rounded-md border border-white/20 px-3 py-2 text-left text-sm hover:bg-white/10"
          type="button"
          @click="logout"
        >
          退出登录
        </button>
      </aside>

      <section
        class="min-w-0 border border-white/15 bg-paper p-5 text-ink md:p-8"
      >
        <RouterView />
      </section>
    </div>
  </div>
</template>
