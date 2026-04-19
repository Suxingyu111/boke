<template>
  <section class="not-found content-shell">
    <div class="ui-surface not-found__panel">
      <p class="eyebrow">404</p>
      <h1 class="not-found__title">页面不存在</h1>
      <p class="not-found__description">
        你访问的页面可能已被移动、删除，或地址输入有误。
      </p>
      <RouterLink class="ui-button-primary not-found__link" to="/">
        返回首页
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.not-found {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.not-found__panel {
  width: min(680px, 100%);
  padding: 30px;
  text-align: center;
}

.not-found__title {
  margin: 8px 0 12px;
  font-size: clamp(1.6rem, 1.8vw + 1rem, 2.3rem);
}

.not-found__description {
  margin: 0 0 18px;
  color: var(--ink-muted);
}

.not-found__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
  padding: 0 16px;
}
</style>
