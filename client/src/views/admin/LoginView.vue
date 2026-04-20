<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiErrorMessage, getOAuthProviders } from "@/api/auth";
import { useTheme } from "@/composables/useTheme";
import { useAuthStore } from "@/stores/auth";
import type { OAuthProviders } from "@/types/blog";
import { getDefaultAuthorizedRoute } from "@/utils/permissions";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { cycleTheme, themeIcon, themeLabel } = useTheme();
const account = ref("");
const password = ref("");
const remember = ref(true);
const errorMessage = ref("");
const oauthProviders = ref<OAuthProviders>({
  github: false,
  google: false,
});

const oauthRedirect = computed(() =>
  typeof route.query.redirect === "string" ? route.query.redirect : "",
);

const githubAuthUrl = computed(() => {
  const query = oauthRedirect.value
    ? `?redirect=${encodeURIComponent(oauthRedirect.value)}`
    : "";
  return `/api/auth/github${query}`;
});

const googleAuthUrl = computed(() => {
  const query = oauthRedirect.value
    ? `?redirect=${encodeURIComponent(oauthRedirect.value)}`
    : "";
  return `/api/auth/google${query}`;
});

watch(
  () => route.query.oauthError,
  (value) => {
    if (typeof value === "string" && value.trim()) {
      errorMessage.value = value;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  try {
    oauthProviders.value = await getOAuthProviders();
  } catch {
    oauthProviders.value = {
      github: false,
      google: false,
    };
  }
});

async function handleLogin() {
  errorMessage.value = "";

  if (account.value.trim().length < 3) {
    errorMessage.value = "账号至少需要 3 个字符";
    return;
  }

  if (password.value.length < 8) {
    errorMessage.value = "密码至少需要 8 个字符";
    return;
  }

  try {
    const response = await authStore.login(
      {
        account: account.value.trim(),
        password: password.value,
      },
      remember.value,
    );

    const redirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "";
    if (redirect) {
      await router.push(redirect);
      return;
    }

    await router.push(getDefaultAuthorizedRoute(response.user));
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      "登录失败，请检查账号和密码",
    );
  }
}
</script>

<template>
  <main
    class="grid min-h-screen bg-paper text-ink lg:grid-cols-[minmax(0,1fr)_500px]"
  >
    <section class="relative hidden min-h-screen overflow-hidden lg:block">
      <img
        alt="夜间书桌上的电脑和笔记"
        class="absolute inset-0 h-full w-full object-cover opacity-75"
        src="https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=1600&q=80"
        width="1600"
        height="1200"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,42,63,0.92),rgba(17,42,63,0.54))]"
      ></div>
      <div
        class="relative flex min-h-screen flex-col justify-between p-12 text-white"
      >
        <RouterLink
          class="focus-ring w-fit rounded-md font-display text-5xl"
          to="/"
          >纸上码头</RouterLink
        >

        <div class="max-w-3xl">
          <p
            class="text-sm font-semibold uppercase tracking-[0.15em] text-citron"
          >
            secure desk
          </p>
          <h1 class="mt-5 font-display text-7xl leading-[1.04]">
            把写作台重新点亮。
          </h1>
          <p class="mt-6 max-w-xl text-lg text-white/82">
            登录后继续管理文章、分类、标签和站点设置。内容的钥匙放在这里，稳一点，也漂亮一点。
          </p>
        </div>

        <div
          class="grid grid-cols-3 overflow-hidden rounded-md border border-white/22 text-sm backdrop-blur"
        >
          <div class="bg-white/10 p-4">
            <p class="text-white/55">Auth</p>
            <p class="mt-1 text-citron">JWT</p>
          </div>
          <div class="border-l border-white/22 bg-white/10 p-4">
            <p class="text-white/55">API</p>
            <p class="mt-1 text-citron">/auth/login</p>
          </div>
          <div class="border-l border-white/22 bg-white/10 p-4">
            <p class="text-white/55">Role</p>
            <p class="mt-1 text-citron">author/admin</p>
          </div>
        </div>
      </div>
    </section>

    <section class="flex min-h-screen items-center p-5 md:p-8">
      <form class="ui-surface w-full p-6 md:p-9" @submit.prevent="handleLogin">
        <div class="flex items-center justify-between gap-3">
          <RouterLink
            class="focus-ring inline-block rounded-md text-sm text-coral lg:hidden"
            to="/"
          >
            返回首页
          </RouterLink>
          <button
            class="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink/72 hover:border-brand hover:text-brand"
            type="button"
            :aria-label="`切换主题，当前：${themeLabel}`"
            @click="cycleTheme"
          >
            <span>{{ themeIcon }}</span>
            <span>{{ themeLabel }}</span>
          </button>
        </div>

        <p class="eyebrow mt-8 lg:mt-0">Login</p>
        <h2 class="mt-2 font-display text-5xl text-brand leading-none">
          欢迎回来
        </h2>
        <p class="mt-4 text-sm leading-6 text-ink/60">
          使用用户名或邮箱登录。勾选记住登录状态后，浏览器会保留 JWT。
        </p>

        <p
          v-if="errorMessage"
          class="mt-6 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral"
        >
          {{ errorMessage }}
        </p>

        <label class="mt-6 block">
          <span class="text-sm font-semibold text-ink/60">用户名或邮箱</span>
          <input
            v-model="account"
            autocomplete="username"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
            placeholder="admin 或 hello@example.com"
            type="text"
          />
        </label>

        <label class="mt-4 block">
          <span class="text-sm font-semibold text-ink/60">密码</span>
          <input
            v-model="password"
            autocomplete="current-password"
            class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
            placeholder="至少 8 位"
            type="password"
          />
        </label>

        <label class="mt-4 flex items-center gap-3 text-sm text-ink/65">
          <input
            v-model="remember"
            class="h-4 w-4 accent-brand"
            type="checkbox"
          />
          记住登录状态
        </label>

        <button
          class="focus-ring ui-button-primary mt-6 w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="authStore.loading"
          type="submit"
        >
          {{ authStore.loading ? "正在登录..." : "登录" }}
        </button>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            class="focus-ring min-h-11 rounded-md border border-line bg-white px-4 py-2 text-center text-sm font-semibold hover:border-brand hover:text-brand"
            :class="!oauthProviders.github && 'pointer-events-none cursor-not-allowed opacity-50'"
            :href="oauthProviders.github ? githubAuthUrl : undefined"
            :aria-disabled="!oauthProviders.github"
          >
            {{ oauthProviders.github ? "GitHub 登录" : "GitHub 未配置" }}
          </a>
          <a
            class="focus-ring min-h-11 rounded-md border border-line bg-white px-4 py-2 text-center text-sm font-semibold hover:border-brand hover:text-brand"
            :class="!oauthProviders.google && 'pointer-events-none cursor-not-allowed opacity-50'"
            :href="oauthProviders.google ? googleAuthUrl : undefined"
            :aria-disabled="!oauthProviders.google"
          >
            {{ oauthProviders.google ? "Google 登录" : "Google 未配置" }}
          </a>
        </div>

        <div
          class="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <RouterLink
            class="focus-ring rounded-md text-coral hover:text-brand"
            to="/register"
          >
            创建新账号
          </RouterLink>
          <RouterLink
            class="focus-ring rounded-md text-ink/55 hover:text-ink"
            to="/"
          >
            先去看看文章
          </RouterLink>
        </div>
      </form>
    </section>
  </main>
</template>
