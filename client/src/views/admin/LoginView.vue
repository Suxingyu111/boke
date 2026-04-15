<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const username = ref("admin");
const password = ref("");

async function handleLogin() {
  authStore.login(username.value, "mock-access-token");
  await router.push("/admin");
}
</script>

<template>
  <main
    class="grid min-h-screen bg-ink text-paper lg:grid-cols-[minmax(0,1fr)_420px]"
  >
    <section class="flex items-end border-r border-white/15 p-8 md:p-12">
      <div>
        <p class="text-sm text-citron">Admin</p>
        <h1
          class="mt-4 max-w-3xl font-display text-5xl leading-tight md:text-6xl"
        >
          内容、分类、标签和系统设置从这里开始。
        </h1>
      </div>
    </section>

    <section class="flex items-center p-6">
      <form class="w-full bg-paper p-6 text-ink" @submit.prevent="handleLogin">
        <h2 class="font-display text-4xl">管理员登录</h2>
        <p class="mt-2 text-sm text-ink/60">
          后端认证模块接入后替换为真实 JWT 登录。
        </p>

        <label class="mt-6 block">
          <span class="text-sm text-ink/60">用户名</span>
          <input
            v-model="username"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
            type="text"
          />
        </label>

        <label class="mt-4 block">
          <span class="text-sm text-ink/60">密码</span>
          <input
            v-model="password"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
            placeholder="任意输入即可进入演示后台"
            type="password"
          />
        </label>

        <button
          class="focus-ring mt-6 w-full rounded-md bg-ink px-4 py-3 text-paper hover:bg-moss"
          type="submit"
        >
          进入后台
        </button>
      </form>
    </section>
  </main>
</template>
