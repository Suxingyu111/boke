<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getApiErrorMessage } from "@/api/auth";
import { request } from "@/api/http";

const route = useRoute();
const status = ref<"loading" | "success" | "error">("loading");
const message = ref("正在处理订阅请求...");
const mode = computed(() =>
  route.name === "subscription-confirm" ? "confirm" : "unsubscribe",
);

onMounted(async () => {
  const token =
    typeof route.params.token === "string"
      ? route.params.token
      : typeof route.query.token === "string"
        ? route.query.token
        : "";

  if (!token) {
    status.value = "error";
    message.value = "订阅链接缺少 token。";
    return;
  }

  try {
    const endpoint =
      mode.value === "confirm"
        ? `/subscriptions/confirm/${token}`
        : `/subscriptions/unsubscribe/${token}`;
    const res = await request<{ message?: string }>(endpoint);
    status.value = "success";
    message.value =
      (res.data as { message?: string }).message ??
      (mode.value === "confirm" ? "订阅已确认，感谢你的关注！" : "退订成功，你已取消订阅。");
  } catch (error) {
    status.value = "error";
    message.value = getApiErrorMessage(error, "订阅链接处理失败");
  }
});
</script>

<template>
  <section class="content-shell py-16 md:py-24">
    <div class="ui-surface mx-auto max-w-2xl p-6 text-center md:p-8">
      <p class="eyebrow">
        {{ mode === "confirm" ? "Confirm Subscription" : "Unsubscribe" }}
      </p>
      <h1 class="mt-3 font-display text-5xl text-brand">
        {{
          status === "loading"
            ? "正在处理"
            : status === "success"
              ? "处理成功"
              : "处理失败"
        }}
      </h1>
      <p class="mt-5 leading-7 text-ink/68">{{ message }}</p>
      <RouterLink
        class="focus-ring ui-button-primary mt-7 inline-flex px-5 py-3"
        to="/"
      >
        回到首页
      </RouterLink>
    </div>
  </section>
</template>
