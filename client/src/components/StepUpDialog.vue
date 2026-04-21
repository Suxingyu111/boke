<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    errorMessage?: string;
  }>(),
  {
    confirmLabel: "验证并继续",
    cancelLabel: "取消",
    loading: false,
    errorMessage: "",
  },
);

const emit = defineEmits<{
  (e: "confirm", password: string): void;
  (e: "cancel"): void;
}>();

const password = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) {
      password.value = "";
    }
  },
);

function submit() {
  emit("confirm", password.value);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-ink/55 px-4"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <section
        class="ui-surface w-full max-w-md p-6 shadow-2xl"
        aria-modal="true"
        role="dialog"
      >
        <p class="eyebrow">Step-Up</p>
        <h2 class="mt-2 font-display text-3xl text-brand">{{ title }}</h2>
        <p class="mt-3 text-sm leading-7 text-ink/65">
          {{ message }}
        </p>
        <label class="mt-5 block text-sm font-semibold text-ink/72" for="step-up-password">
          当前登录密码
        </label>
        <input
          id="step-up-password"
          v-model="password"
          class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-4 py-3"
          :disabled="loading"
          placeholder="请输入当前密码"
          type="password"
          @keydown.enter.prevent="submit"
        />
        <p v-if="errorMessage" class="mt-3 text-sm text-coral">
          {{ errorMessage }}
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button
            class="focus-ring ui-button-secondary px-4 py-2"
            :disabled="loading"
            type="button"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="focus-ring ui-button-primary px-4 py-2"
            :disabled="loading || !password.trim()"
            type="button"
            @click="submit"
          >
            {{ loading ? "验证中..." : confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
