<script setup lang="ts">
import { listLinks } from "@/services/blog";

const links = listLinks();
</script>

<template>
  <section class="content-shell py-12">
    <p class="text-sm text-coral">Friends</p>
    <h1 class="mt-2 font-display text-5xl">友情链接</h1>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <a
        v-for="link in links"
        :key="link.id"
        class="focus-ring border border-line bg-white p-5 hover:shadow-editorial"
        :href="link.url"
        rel="noreferrer"
        target="_blank"
      >
        <h2 class="font-display text-3xl">{{ link.name }}</h2>
        <p class="mt-3 text-ink/65">{{ link.description }}</p>
      </a>
    </div>
  </section>
</template>
