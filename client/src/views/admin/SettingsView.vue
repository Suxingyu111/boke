<script setup lang="ts">
import { reactive } from "vue";
import { getSiteSettings } from "@/services/blog";

const settings = reactive({ ...getSiteSettings() });
</script>

<template>
  <div>
    <p class="text-sm text-coral">Settings</p>
    <h1 class="mt-2 font-display text-5xl">系统设置</h1>

    <form class="mt-8 grid gap-5 border border-line bg-white p-5">
      <label class="block">
        <span class="text-sm text-ink/60">博客标题</span>
        <input
          v-model="settings.title"
          class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
        />
      </label>
      <label class="block">
        <span class="text-sm text-ink/60">副标题</span>
        <input
          v-model="settings.subtitle"
          class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
        />
      </label>
      <label class="block">
        <span class="text-sm text-ink/60">站点描述</span>
        <textarea
          v-model="settings.description"
          class="focus-ring mt-2 min-h-28 w-full rounded-md border border-line px-3 py-3"
        ></textarea>
      </label>
      <label class="block">
        <span class="text-sm text-ink/60">备案信息</span>
        <input
          v-model="settings.icp"
          class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
        />
      </label>
      <button
        class="focus-ring w-fit rounded-md bg-ink px-4 py-3 text-paper hover:bg-moss"
        type="button"
      >
        保存设置
      </button>
    </form>
  </div>
</template>
