<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  checkRegistrationAvailability,
  getApiErrorMessage,
  sendRegistrationCode,
  verifyRegistrationCode,
} from "@/api/auth";
import { useTheme } from "@/composables/useTheme";
import { useAuthStore } from "@/stores/auth";
import type { RegisterType } from "@/types/blog";

type FieldState = {
  kind: "idle" | "checking" | "success" | "error";
  message: string;
};

const router = useRouter();
const authStore = useAuthStore();
const { cycleTheme, themeIcon, themeLabel } = useTheme();

const registerType = ref<RegisterType>("email");
const contact = ref("");
const verificationCode = ref("");
const username = ref("");
const nickname = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMessage = ref("");
const noticeMessage = ref("");
const verificationToken = ref("");
const sendCodeCooldown = ref(0);
const maskedContact = ref("");

const fieldState = reactive<Record<"contact" | "username" | "nickname", FieldState>>({
  contact: { kind: "idle", message: "" },
  username: { kind: "idle", message: "" },
  nickname: { kind: "idle", message: "" },
});

let cooldownTimer: number | null = null;

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

const contactLabel = computed(() =>
  registerType.value === "email" ? "邮箱" : "手机号",
);
const contactPlaceholder = computed(() =>
  registerType.value === "email" ? "hello@example.com" : "13800138000",
);
const contactAutocomplete = computed(() =>
  registerType.value === "email" ? "email" : "tel",
);
const contactHelp = computed(() =>
  registerType.value === "email"
    ? "验证码会发送到该邮箱。"
    : "验证码会发送到该手机号。开发环境下会在页面提示验证码。",
);
const isContactVerified = computed(() => Boolean(verificationToken.value));

function setFieldState(
  field: "contact" | "username" | "nickname",
  kind: FieldState["kind"],
  message: string,
) {
  fieldState[field] = { kind, message };
}

function clearCooldown() {
  if (cooldownTimer !== null) {
    window.clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function startCooldown(seconds: number) {
  clearCooldown();
  sendCodeCooldown.value = seconds;
  cooldownTimer = window.setInterval(() => {
    sendCodeCooldown.value -= 1;
    if (sendCodeCooldown.value <= 0) {
      sendCodeCooldown.value = 0;
      clearCooldown();
    }
  }, 1000);
}

function normalizeContact(value: string, type: RegisterType) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(type === "email" ? "请输入邮箱" : "请输入手机号");
  }

  if (type === "email") {
    const normalized = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("请输入有效邮箱");
    }
    return normalized;
  }

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("请输入有效手机号");
  }
  return `+${digits}`;
}

function ensureLocalValidation() {
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(username.value.trim())) {
    throw new Error("用户名需为 3-50 位字母、数字或下划线");
  }

  if (nickname.value.trim() && nickname.value.trim().length < 2) {
    throw new Error("昵称至少需要 2 个字符");
  }

  if (!passwordHint.value.every((item) => item.active)) {
    throw new Error("密码需至少 8 位，并同时包含字母和数字");
  }

  if (password.value !== confirmPassword.value) {
    throw new Error("两次输入的密码不一致");
  }

  if (!verificationToken.value) {
    throw new Error("请先完成邮箱或手机号验证码认证");
  }
}

async function checkAvailability(field: "username" | "nickname") {
  const value = field === "username" ? username.value.trim() : nickname.value.trim();
  if (!value) {
    setFieldState(field, "idle", "");
    return true;
  }

  setFieldState(field, "checking", "检查中...");
  try {
    const response = await checkRegistrationAvailability({ [field]: value });
    const result = response[field];
    if (!result) {
      setFieldState(field, "idle", "");
      return true;
    }
    setFieldState(field, result.available ? "success" : "error", result.message ?? "");
    return result.available;
  } catch (error) {
    setFieldState(field, "error", getApiErrorMessage(error, "检查失败，请稍后重试"));
    return false;
  }
}

async function handleSendCode() {
  errorMessage.value = "";
  noticeMessage.value = "";
  setFieldState("contact", "idle", "");

  let normalizedContact = "";
  try {
    normalizedContact = normalizeContact(contact.value, registerType.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "联系方式格式不正确";
    errorMessage.value = message;
    setFieldState("contact", "error", message);
    return;
  }

  try {
    const response = await sendRegistrationCode({
      registerType: registerType.value,
      contact: normalizedContact,
    });
    maskedContact.value = response.maskedContact;
    verificationToken.value = "";
    verificationCode.value = "";
    setFieldState("contact", "success", `验证码已发送至 ${response.maskedContact}`);
    if (response.debugCode) {
      noticeMessage.value = `开发验证码：${response.debugCode}`;
    } else {
      noticeMessage.value = `验证码已发送至 ${response.maskedContact}`;
    }
    startCooldown(response.cooldownSeconds);
  } catch (error) {
    const message = getApiErrorMessage(error, "验证码发送失败，请稍后重试");
    errorMessage.value = message;
    setFieldState("contact", "error", message);
  }
}

async function handleVerifyCode() {
  errorMessage.value = "";
  noticeMessage.value = "";

  let normalizedContact = "";
  try {
    normalizedContact = normalizeContact(contact.value, registerType.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "联系方式格式不正确";
    errorMessage.value = message;
    setFieldState("contact", "error", message);
    return;
  }

  if (!/^\d{6}$/.test(verificationCode.value.trim())) {
    errorMessage.value = "请输入 6 位数字验证码";
    return;
  }

  try {
    const response = await verifyRegistrationCode({
      registerType: registerType.value,
      contact: normalizedContact,
      code: verificationCode.value.trim(),
    });
    verificationToken.value = response.verificationToken;
    maskedContact.value = response.maskedContact;
    setFieldState("contact", "success", `${response.maskedContact} 已认证，可继续注册`);
    noticeMessage.value = `${response.maskedContact} 已完成认证`;
  } catch (error) {
    const message = getApiErrorMessage(error, "验证码校验失败，请稍后重试");
    errorMessage.value = message;
    setFieldState("contact", "error", message);
  }
}

async function handleRegister() {
  errorMessage.value = "";
  noticeMessage.value = "";

  try {
    ensureLocalValidation();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "注册信息填写有误";
    return;
  }

  const [usernameAvailable, nicknameAvailable] = await Promise.all([
    checkAvailability("username"),
    nickname.value.trim() ? checkAvailability("nickname") : Promise.resolve(true),
  ]);

  if (!usernameAvailable || !nicknameAvailable) {
    errorMessage.value = "请先修正已存在的用户名或昵称";
    return;
  }

  try {
    const response = await authStore.register({
      registerType: registerType.value,
      verificationToken: verificationToken.value,
      username: username.value.trim(),
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

watch([registerType, contact], () => {
  verificationToken.value = "";
  verificationCode.value = "";
  maskedContact.value = "";
  errorMessage.value = "";
  noticeMessage.value = "";
  setFieldState("contact", "idle", "");
});

onBeforeUnmount(() => {
  clearCooldown();
});

function fieldClass(field: FieldState["kind"]) {
  if (field === "success") return "border-moss/30 bg-moss/10 text-moss";
  if (field === "error") return "border-coral/30 bg-coral/10 text-coral";
  if (field === "checking") return "border-brand/20 bg-brand/10 text-brand";
  return "border-line text-ink/45";
}
</script>

<template>
  <main
    class="grid min-h-screen bg-paper text-ink lg:grid-cols-[500px_minmax(0,1fr)]"
  >
    <section class="flex min-h-screen items-center p-5 md:p-8">
      <form
        class="ui-surface w-full p-6 md:p-9"
        @submit.prevent="handleRegister"
      >
        <div class="flex items-center justify-between gap-3">
          <RouterLink
            class="focus-ring inline-block rounded-md text-sm text-coral"
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

        <p class="eyebrow mt-8">Register</p>
        <h1 class="mt-2 font-display text-5xl leading-none text-brand">
          双通道注册
        </h1>
        <p class="mt-4 text-sm leading-6 text-ink/60">
          先选择邮箱或手机号完成验证码认证，再创建账号。用户名、昵称和联系方式都会校验唯一性。
        </p>

        <div class="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper p-1">
          <button
            class="focus-ring rounded-lg px-4 py-3 text-sm font-semibold transition"
            :class="registerType === 'email' ? 'bg-brand text-white shadow-soft' : 'text-ink/60 hover:text-ink'"
            type="button"
            @click="registerType = 'email'"
          >
            邮箱注册
          </button>
          <button
            class="focus-ring rounded-lg px-4 py-3 text-sm font-semibold transition"
            :class="registerType === 'phone' ? 'bg-brand text-white shadow-soft' : 'text-ink/60 hover:text-ink'"
            type="button"
            @click="registerType = 'phone'"
          >
            手机号注册
          </button>
        </div>

        <p
          v-if="errorMessage"
          class="mt-6 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral"
        >
          {{ errorMessage }}
        </p>
        <p
          v-if="noticeMessage"
          class="mt-4 rounded-md border border-moss/25 bg-white px-3 py-2 text-sm text-moss"
        >
          {{ noticeMessage }}
        </p>

        <div class="mt-6 grid gap-4">
          <label class="block">
            <span class="text-sm font-semibold text-ink/60">{{ contactLabel }}</span>
            <div class="mt-2 flex gap-2">
              <input
                v-model="contact"
                :autocomplete="contactAutocomplete"
                class="focus-ring min-w-0 flex-1 rounded-md border border-line px-3 py-3"
                :placeholder="contactPlaceholder"
                :type="registerType === 'email' ? 'email' : 'tel'"
              />
              <button
                class="focus-ring rounded-md border border-line px-3 py-3 text-sm font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-55"
                :disabled="sendCodeCooldown > 0 || authStore.loading"
                type="button"
                @click="handleSendCode"
              >
                {{ sendCodeCooldown > 0 ? `${sendCodeCooldown}s` : "发送验证码" }}
              </button>
            </div>
            <p class="mt-1 text-xs text-ink/40">{{ contactHelp }}</p>
          </label>

          <p
            v-if="fieldState.contact.message"
            class="rounded-md border px-3 py-2 text-sm"
            :class="fieldClass(fieldState.contact.kind)"
          >
            {{ fieldState.contact.message }}
          </p>

          <label class="block">
            <span class="text-sm font-semibold text-ink/60">验证码</span>
            <div class="mt-2 flex gap-2">
              <input
                v-model="verificationCode"
                autocomplete="one-time-code"
                class="focus-ring min-w-0 flex-1 rounded-md border border-line px-3 py-3 tracking-[0.35em]"
                maxlength="6"
                placeholder="6 位数字"
                type="text"
              />
              <button
                class="focus-ring rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                :disabled="authStore.loading"
                type="button"
                @click="handleVerifyCode"
              >
                {{ isContactVerified ? "重新校验" : "校验验证码" }}
              </button>
            </div>
            <p class="mt-1 text-xs text-ink/40">
              {{ isContactVerified ? `已认证：${maskedContact}` : "需先完成认证才能提交注册" }}
            </p>
          </label>

          <label class="block">
            <span class="text-sm font-semibold text-ink/60">用户名</span>
            <input
              v-model="username"
              autocomplete="username"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              placeholder="letters_2026"
              type="text"
              @blur="checkAvailability('username')"
            />
          </label>
          <p
            v-if="fieldState.username.message"
            class="rounded-md border px-3 py-2 text-sm"
            :class="fieldClass(fieldState.username.kind)"
          >
            {{ fieldState.username.message }}
          </p>

          <label class="block">
            <span class="text-sm font-semibold text-ink/60">昵称</span>
            <input
              v-model="nickname"
              autocomplete="nickname"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
              placeholder="可选，但若填写必须唯一"
              type="text"
              @blur="checkAvailability('nickname')"
            />
          </label>
          <p
            v-if="fieldState.nickname.message"
            class="rounded-md border px-3 py-2 text-sm"
            :class="fieldClass(fieldState.nickname.kind)"
          >
            {{ fieldState.nickname.message }}
          </p>

          <label class="block">
            <span class="text-sm font-semibold text-ink/60">密码</span>
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
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line text-ink/45'
              "
            >
              {{ item.label }}
            </span>
          </div>

          <label class="block">
            <span class="text-sm font-semibold text-ink/60">确认密码</span>
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
            class="focus-ring rounded-md text-coral hover:text-brand"
            to="/login"
          >
            去登录
          </RouterLink>
        </p>
      </form>
    </section>

    <section class="relative hidden min-h-screen overflow-hidden lg:block">
      <img
        alt="桌面上的书、咖啡和笔记"
        class="absolute inset-0 h-full w-full object-cover opacity-75"
        src="https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1600&q=80"
        width="1600"
        height="1200"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(260deg,rgba(17,42,63,0.9),rgba(17,42,63,0.52))]"
      ></div>

      <div
        class="relative flex min-h-screen flex-col justify-between p-12 text-white"
      >
        <div
          class="grid w-fit grid-cols-[44px_44px_44px] overflow-hidden rounded-md border border-white/22"
        >
          <span class="h-11 bg-citron"></span>
          <span class="h-11 bg-coral"></span>
          <span class="h-11 bg-moss"></span>
        </div>

        <div class="ml-auto max-w-3xl text-right">
          <p
            class="text-sm font-semibold uppercase tracking-[0.15em] text-citron"
          >
            safe onboarding
          </p>
          <h2 class="mt-5 font-display text-7xl leading-[1.04]">
            先认证，再开通。
          </h2>
          <p class="ml-auto mt-6 max-w-xl text-lg text-white/82">
            注册流程同时校验联系方式、用户名和昵称，避免重复账号，也把验证码和冷却机制一起补齐。
          </p>
        </div>

        <div
          class="ml-auto grid max-w-xl grid-cols-3 overflow-hidden rounded-[14px] border border-white/22 text-sm backdrop-blur"
        >
          <div class="bg-white/10 p-4">
            <p class="text-white/55">Channel</p>
            <p class="mt-1 text-citron">邮箱 / 手机号</p>
          </div>
          <div class="border-l border-white/22 bg-white/10 p-4">
            <p class="text-white/55">Verify</p>
            <p class="mt-1 text-citron">6 位验证码</p>
          </div>
          <div class="border-l border-white/22 bg-white/10 p-4">
            <p class="text-white/55">Safety</p>
            <p class="mt-1 text-citron">唯一性 + 冷却</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
