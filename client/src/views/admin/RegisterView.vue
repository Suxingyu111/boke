<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const email = ref("");
const nickname = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMessage = ref("");

const passwordHint = computed(() => {
  const hasLetter = /[A-Za-z]/.test(password.value);
  const hasNumber = /\d/.test(password.value);
  const longEnough = password.value.length >= 8;

  return [
    { label: "8 位以上", active: longEnough },
    { label: "包含字母", active: hasLetter },
    { label: "包含数字", active: hasNumber },
  ];
});

async function handleRegister() {
  errorMessage.value = "";

  if (!/^[a-zA-Z0-9_]{3,50}$/.test(username.value.trim())) {
    errorMessage.value = "用户名需为 3-50 位字母、数字或下划线";
    return;
  }

  if (!email.value.includes("@")) {
    errorMessage.value = "请输入有效邮箱";
    return;
  }

  if (!passwordHint.value.every((item) => item.active)) {
    errorMessage.value = "密码需至少 8 位，并同时包含字母和数字";
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = "两次输入的密码不一致";
    return;
  }

  try {
    const response = await authStore.register({
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      nickname: nickname.value.trim() || undefined,
    });

    await router.push(
      response.user.role === "admin" || response.user.role === "super_admin"
        ? "/admin"
        : "/",
    );
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "注册失败，请稍后再试");
  }
}
</script>

<template>
  <main
    class="grid min-h-screen bg-paper text-ink lg:grid-cols-[460px_minmax(0,1fr)]"
  >
    <section class="flex min-h-screen items-center p-5 md:p-8">
      <form
        class="ui-surface w-full p-5 md:p-8"
        @submit.prevent="handleRegister"
      >
        <RouterLink
          class="focus-ring inline-block rounded-md text-sm text-coral"
          to="/"
        >
          返回首页
        </RouterLink>

        <p class="eyebrow mt-8">Register</p>
        <h1 class="mt-2 font-display text-5xl leading-none">开一个新账号</h1>
        <p class="mt-4 text-sm leading-6 text-ink/60">
          注册成功后会自动登录。默认角色为普通用户，管理员权限由后端分配。
        </p>

        <p
          v-if="errorMessage"
          class="mt-6 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral"
        >
          {{ errorMessage }}
        </p>

        <div class="mt-6 grid gap-4">
          <label class="block">
            <span class="text-sm text-ink/60">用户名</span>
            <input
              v-model="username"
              autocomplete="username"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              placeholder="letters_2026"
              type="text"
            />
          </label>

          <label class="block">
            <span class="text-sm text-ink/60">邮箱</span>
            <input
              v-model="email"
              autocomplete="email"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              placeholder="hello@example.com"
              type="email"
            />
          </label>

          <label class="block">
            <span class="text-sm text-ink/60">昵称</span>
            <input
              v-model="nickname"
              autocomplete="nickname"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              placeholder="可选"
              type="text"
            />
          </label>

          <label class="block">
            <span class="text-sm text-ink/60">密码</span>
            <input
              v-model="password"
              autocomplete="new-password"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              placeholder="至少 8 位，包含字母和数字"
              type="password"
            />
          </label>

          <div class="flex flex-wrap gap-2">
            <span
              v-for="item in passwordHint"
              :key="item.label"
              class="rounded-md border px-2 py-1 text-xs"
              :class="
                item.active
                  ? 'border-moss bg-moss/10 text-moss'
                  : 'border-line text-ink/45'
              "
            >
              {{ item.label }}
            </span>
          </div>

          <label class="block">
            <span class="text-sm text-ink/60">确认密码</span>
            <input
              v-model="confirmPassword"
              autocomplete="new-password"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              type="password"
            />
          </label>
        </div>

        <button
          class="focus-ring ui-button-primary mt-6 w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="authStore.loading"
          type="submit"
        >
          {{ authStore.loading ? "正在创建..." : "注册并登录" }}
        </button>

        <p class="mt-6 text-sm text-ink/60">
          已有账号？
          <RouterLink
            class="focus-ring rounded-md text-coral hover:text-moss"
            to="/login"
          >
            去登录
          </RouterLink>
        </p>
      </form>
    </section>

    <section
      class="relative hidden min-h-screen overflow-hidden bg-ink text-paper lg:block"
    >
      <img
        alt="桌面上的书、咖啡和笔记"
        class="absolute inset-0 h-full w-full object-cover opacity-60 grayscale"
        src="https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1600&q=80"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(270deg,rgba(17,20,20,0.88),rgba(17,20,20,0.38))]"
      ></div>

      <div class="relative flex min-h-screen flex-col justify-between p-12">
        <div
          class="grid w-fit grid-cols-[44px_44px_44px] border border-white/20"
        >
          <span class="h-11 bg-citron"></span>
          <span class="h-11 bg-coral"></span>
          <span class="h-11 bg-moss"></span>
        </div>

        <div class="ml-auto max-w-3xl text-right">
          <p class="text-sm font-semibold uppercase text-citron">new author</p>
          <h2 class="mt-5 font-display text-6xl leading-tight">
            写作账户，从第一枚铅字开始。
          </h2>
          <p class="ml-auto mt-6 max-w-xl text-lg text-paper/75">
            账号创建后可以参与登录态交互，后续接入用户中心、评论、收藏和多作者权限。
          </p>
        </div>

        <div
          class="ml-auto grid max-w-xl grid-cols-2 border border-white/20 text-sm"
        >
          <div class="p-4">
            <p class="text-paper/50">Username</p>
            <p class="mt-1 text-citron">字母 / 数字 / 下划线</p>
          </div>
          <div class="border-l border-white/20 p-4">
            <p class="text-paper/50">Password</p>
            <p class="mt-1 text-citron">字母 + 数字</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
