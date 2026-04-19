<script setup lang="ts">
import AppHeader from "@/components/AppHeader.vue";
</script>

<template>
  <div class="ui-page text-ink">
    <AppHeader />
    <main id="main-content" class="animate-rise pb-6">
      <RouterView />
    </main>
  </div>
</template>
