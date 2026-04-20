<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    variant?: "primary" | "danger";
  }>(),
  {
    confirmLabel: "确认",
    cancelLabel: "取消",
    loading: false,
    variant: "primary",
  },
);

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 px-4"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <section
        class="ui-surface w-full max-w-md p-6 shadow-2xl"
        aria-modal="true"
        role="dialog"
      >
        <p class="eyebrow">Confirm</p>
        <h2 class="mt-2 font-display text-3xl text-brand">{{ title }}</h2>
        <p class="mt-3 text-sm leading-7 text-ink/65">
          {{ message }}
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
            class="focus-ring px-4 py-2"
            :class="
              variant === 'danger'
                ? 'rounded-md border border-coral bg-coral text-white'
                : 'ui-button-primary'
            "
            :disabled="loading"
            type="button"
            @click="emit('confirm')"
          >
            {{ loading ? "处理中..." : confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
