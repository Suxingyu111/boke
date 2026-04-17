<script setup lang="ts">
import { onMounted, reactive, watch } from "vue";
import { useSiteStore } from "@/stores/site";
import type { SiteSettings } from "@/types/blog";

const siteStore = useSiteStore();
const settings = reactive<SiteSettings>({ ...siteStore.settings });

function syncForm(nextSettings: SiteSettings) {
  Object.assign(settings, {
    ...nextSettings,
    socialLinks: nextSettings.socialLinks.map((link) => ({ ...link })),
  });
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

function addSocialLink() {
  settings.socialLinks.push({ label: "", url: "" });
}

function removeSocialLink(index: number) {
  settings.socialLinks.splice(index, 1);
}
</script>

<template>
  <div>
    <p class="eyebrow">Settings</p>
    <h1 class="mt-2 font-display text-5xl text-brand">系统设置</h1>

    <form
      class="ui-surface mt-8 grid gap-6 p-6 md:p-8"
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
        <span class="text-sm font-semibold text-ink/60">博客标题</span>
        <input
          v-model="settings.title"
          class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
        />
      </label>
      <label class="block">
        <span class="text-sm font-semibold text-ink/60">副标题</span>
        <input
          v-model="settings.subtitle"
          class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
        />
      </label>
      <label class="block">
        <span class="text-sm font-semibold text-ink/60">站点描述</span>
        <textarea
          v-model="settings.description"
          class="focus-ring mt-2 min-h-28 w-full rounded-md border border-line bg-white/92 px-3 py-3"
        ></textarea>
      </label>
      <label class="block">
        <span class="text-sm font-semibold text-ink/60">备案信息</span>
        <input
          v-model="settings.icp"
          class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
        />
      </label>
      <label class="block">
        <span class="text-sm font-semibold text-ink/60">版权信息</span>
        <input
          v-model="settings.copyright"
          class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
        />
      </label>
      <fieldset class="grid gap-3">
        <legend class="text-sm font-semibold text-ink/60">社交链接</legend>
        <div
          v-for="(link, index) in settings.socialLinks"
          :key="index"
          class="grid gap-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] md:items-end"
        >
          <label>
            <span class="text-sm font-semibold text-ink/60">名称</span>
            <input
              v-model="link.label"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
              placeholder="GitHub"
            />
          </label>
          <label>
            <span class="text-sm font-semibold text-ink/60">链接</span>
            <input
              v-model="link.url"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
              placeholder="https://example.com"
            />
          </label>
          <button
            class="focus-ring ui-button-secondary px-4 py-2 text-sm"
            type="button"
            @click="removeSocialLink(index)"
          >
            删除
          </button>
        </div>
        <button
          class="focus-ring ui-button-secondary w-fit px-4 py-2 text-sm"
          type="button"
          @click="addSocialLink"
        >
          添加社交链接
        </button>
      </fieldset>
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
