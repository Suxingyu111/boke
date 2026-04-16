<script setup lang="ts">
import { onMounted } from "vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();

onMounted(() => {
  void siteStore.loadPublicSettings();
});
</script>

<template>
  <RouterView />
</template>
