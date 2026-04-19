<script setup lang="ts">
import { onErrorCaptured, ref } from "vue";

const hasError = ref(false);
const errorMessage = ref("页面发生异常，请稍后重试。");

onErrorCaptured((error) => {
  hasError.value = true;
  errorMessage.value = error instanceof Error ? error.message : "页面发生异常，请稍后重试。";
  return false;
});

function reloadPage() {
  window.location.reload();
}
</script>

<template>
  <slot v-if="!hasError" />
  <section v-else class="error-boundary">
    <div class="ui-surface error-boundary__panel">
      <p class="eyebrow">500</p>
      <h1 class="error-boundary__title">页面渲染失败</h1>
      <p class="error-boundary__message">{{ errorMessage }}</p>
      <div class="error-boundary__actions">
        <RouterLink class="ui-button-secondary error-boundary__button" to="/">
          返回首页
        </RouterLink>
        <button class="ui-button-primary error-boundary__button" type="button" @click="reloadPage">
          刷新页面
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.error-boundary__panel {
  width: min(640px, 100%);
  padding: 28px;
  text-align: center;
}

.error-boundary__title {
  margin: 8px 0 12px;
  font-size: clamp(1.4rem, 1.6vw + 1rem, 2rem);
}

.error-boundary__message {
  margin: 0;
  color: var(--ink-muted);
}

.error-boundary__actions {
  margin-top: 18px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.error-boundary__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 128px;
  padding: 0 16px;
}
</style>
