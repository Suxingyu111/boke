<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { getDefaultAuthorizedRoute } from "@/utils/permissions";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const errorMessage = ref("");

function resolveRedirectTarget() {
  const redirect =
    typeof route.query.redirect === "string" &&
    route.query.redirect.startsWith("/") &&
    !route.query.redirect.startsWith("//")
      ? route.query.redirect
      : "";

  if (redirect) {
    return redirect;
  }

  return getDefaultAuthorizedRoute(authStore.user);
}

onMounted(async () => {
  try {
    await authStore.completeOAuthLogin(true);
    await router.replace(resolveRedirectTarget());
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "OAuth 登录失败，请稍后再试");
    await router.replace({
      name: "login",
      query: {
        oauthError: errorMessage.value,
        redirect:
          typeof route.query.redirect === "string" ? route.query.redirect : "",
      },
    });
  }
});
</script>

<template>
  <main class="content-shell flex min-h-[60vh] items-center justify-center py-16">
    <section class="ui-surface w-full max-w-xl p-8 text-center">
      <p class="eyebrow">OAuth</p>
      <h1 class="mt-3 font-display text-4xl text-brand">正在完成登录</h1>
      <p class="mt-4 text-sm leading-7 text-ink/65">
        正在同步第三方授权结果并恢复你的登录状态，请稍候。
      </p>
      <p v-if="errorMessage" class="mt-5 text-sm text-coral">
        {{ errorMessage }}
      </p>
    </section>
  </main>
</template>
