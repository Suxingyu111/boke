<script setup lang="ts">
import { onMounted, reactive, watch } from "vue";
import { useSiteStore } from "@/stores/site";
import type { SiteSettings } from "@/types/blog";

const siteStore = useSiteStore();
const settings = reactive<SiteSettings>({ ...siteStore.settings });

function syncForm(nextSettings: SiteSettings) {
  Object.assign(settings, nextSettings);
}

onMounted(async () => {
  await siteStore.loadAdminSettings();
  syncForm(siteStore.settings);
});

watch(
  () => siteStore.settings,
  (nextSettings) => {
    syncForm(nextSettings);
  },
);

async function saveSettings() {
  await siteStore.saveSettings({ ...settings });
}
</script>

<template>
  <div>
    <p class="eyebrow">Settings</p>
    <h1 class="mt-2 font-display text-5xl">系统设置</h1>

    <form
      class="ui-surface mt-8 grid gap-5 p-5 md:p-6"
      @submit.prevent="saveSettings"
    >
      <p
        v-if="siteStore.settingsNotice"
        class="rounded-md border border-moss/25 bg-moss/10 px-3 py-2 text-sm text-moss"
      >
        {{ siteStore.settingsNotice }}
      </p>
      <p
        v-if="siteStore.settingsError"
        class="rounded-md border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral"
      >
        {{ siteStore.settingsError }}
      </p>

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
      <label class="block">
        <span class="text-sm text-ink/60">版权信息</span>
        <input
          v-model="settings.copyright"
          class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-3"
        />
      </label>
      <button
        class="focus-ring ui-button-primary w-fit px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="siteStore.settingsSaving || siteStore.settingsLoading"
        type="submit"
      >
        {{
          siteStore.settingsSaving
            ? "正在保存..."
            : siteStore.settingsLoading
              ? "正在读取..."
              : "保存设置"
        }}
      </button>
    </form>
  </div>
</template>
