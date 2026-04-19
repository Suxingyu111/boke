<script setup lang="ts">
import { onMounted, reactive, watch } from "vue";
import { useSiteStore } from "@/stores/site";
import type { SiteSettings, AboutSettings, TimelineItem } from "@/types/blog";

const siteStore = useSiteStore();
const settings = reactive<SiteSettings>({ ...siteStore.settings });

function syncForm(nextSettings: SiteSettings) {
  Object.assign(settings, {
    ...nextSettings,
    socialLinks: nextSettings.socialLinks.map((link) => ({ ...link })),
  });
}

const aboutForm = reactive<AboutSettings>({
  techStack: [],
  timeline: [],
  contactEmail: "",
  githubUrl: "",
});

function syncAboutForm(next: AboutSettings) {
  aboutForm.techStack = [...next.techStack];
  aboutForm.timeline = next.timeline.map((t) => ({ ...t }));
  aboutForm.contactEmail = next.contactEmail;
  aboutForm.githubUrl = next.githubUrl;
}

onMounted(async () => {
  await siteStore.loadAdminSettings();
  syncForm(siteStore.settings);
  syncAboutForm(siteStore.aboutSettings);
});

watch(
  () => siteStore.settings,
  (nextSettings) => {
    syncForm(nextSettings);
  },
);

watch(
  () => siteStore.aboutSettings,
  (next) => syncAboutForm(next),
);

async function saveSettings() {
  await siteStore.saveSettings({ ...settings });
}

async function saveAboutSettings() {
  await siteStore.saveAboutSettings({
    techStack: [...aboutForm.techStack],
    timeline: aboutForm.timeline.map((t) => ({ ...t })),
    contactEmail: aboutForm.contactEmail,
    githubUrl: aboutForm.githubUrl,
  });
}

function addSocialLink() {
  settings.socialLinks.push({ label: "", url: "" });
}

function removeSocialLink(index: number) {
  settings.socialLinks.splice(index, 1);
}

const newTechTag = reactive({ value: "" });

function addTechTag() {
  const tag = newTechTag.value.trim();
  if (tag && !aboutForm.techStack.includes(tag)) {
    aboutForm.techStack.push(tag);
  }
  newTechTag.value = "";
}

function removeTechTag(index: number) {
  aboutForm.techStack.splice(index, 1);
}

function addTimelineItem() {
  aboutForm.timeline.push({ year: "", title: "", desc: "" });
}

function removeTimelineItem(index: number) {
  aboutForm.timeline.splice(index, 1);
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
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="text-sm font-semibold text-ink/60">SEO 关键词</span>
          <input
            v-model="settings.keywords"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
            placeholder="个人博客,Vue,NestJS"
          />
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink/60">站点作者</span>
          <input
            v-model="settings.author"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
          />
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <label class="block">
          <span class="text-sm font-semibold text-ink/60">Logo URL</span>
          <input
            v-model="settings.logo"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
            placeholder="/favicon.svg"
          />
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink/60">Favicon URL</span>
          <input
            v-model="settings.favicon"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
            placeholder="/favicon.svg"
          />
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink/60">社交分享图</span>
          <input
            v-model="settings.ogImage"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white/92 px-3 py-3"
            placeholder="https://..."
          />
        </label>
      </div>
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

    <!-- About Page Settings -->
    <form
      class="ui-surface mt-8 grid gap-6 p-6 md:p-8"
      @submit.prevent="saveAboutSettings"
    >
      <p class="col-span-full font-display text-2xl text-brand">关于页信息</p>

      <!-- Contact -->
      <fieldset class="grid gap-4 border-0">
        <legend class="font-display text-lg text-brand/80">联系方式</legend>
        <div class="grid gap-1">
          <label class="text-sm font-medium">联系邮箱</label>
          <input
            v-model="aboutForm.contactEmail"
            type="email"
            class="ui-input"
            placeholder="hello@example.com"
          />
        </div>
        <div class="grid gap-1">
          <label class="text-sm font-medium">GitHub 链接</label>
          <input
            v-model="aboutForm.githubUrl"
            type="url"
            class="ui-input"
            placeholder="https://github.com/yourname"
          />
        </div>
      </fieldset>

      <!-- Tech Stack -->
      <fieldset class="grid gap-4 border-0">
        <legend class="font-display text-lg text-brand/80">技术栈标签</legend>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(tag, idx) in aboutForm.techStack"
            :key="tag"
            class="flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-sm text-brand"
          >
            {{ tag }}
            <button
              type="button"
              class="ml-1 text-brand/50 hover:text-accent"
              @click="removeTechTag(idx)"
            >×</button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="newTechTag.value"
            class="ui-input flex-1"
            placeholder="新标签（回车添加）"
            @keydown.enter.prevent="addTechTag"
          />
          <button
            class="focus-ring ui-button-secondary px-4 py-2 text-sm"
            type="button"
            @click="addTechTag"
          >添加</button>
        </div>
      </fieldset>

      <!-- Timeline -->
      <fieldset class="grid gap-4 border-0">
        <legend class="font-display text-lg text-brand/80">成长轨迹</legend>
        <div
          v-for="(item, idx) in aboutForm.timeline"
          :key="idx"
          class="grid grid-cols-[7rem_1fr_auto] items-start gap-3 rounded-lg bg-brand/5 p-4"
        >
          <div class="grid gap-1">
            <label class="text-xs text-brand/60">年份</label>
            <input v-model="item.year" class="ui-input" placeholder="2023" />
          </div>
          <div class="grid gap-3">
            <div class="grid gap-1">
              <label class="text-xs text-brand/60">标题</label>
              <input v-model="item.title" class="ui-input" placeholder="里程碑事件" />
            </div>
            <div class="grid gap-1">
              <label class="text-xs text-brand/60">描述</label>
              <textarea v-model="item.desc" class="ui-input resize-none" rows="2" placeholder="简短描述…" />
            </div>
          </div>
          <button
            type="button"
            class="mt-6 text-sm text-brand/40 hover:text-accent"
            @click="removeTimelineItem(idx)"
          >删除</button>
        </div>
        <button
          class="focus-ring ui-button-secondary w-fit px-4 py-2 text-sm"
          type="button"
          @click="addTimelineItem"
        >添加轨迹项</button>
      </fieldset>

      <div class="flex items-center gap-4">
        <button
          class="focus-ring ui-button-primary w-fit px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="siteStore.aboutSettingsSaving || siteStore.settingsLoading"
          type="submit"
        >
          {{ siteStore.aboutSettingsSaving ? "正在保存..." : "保存关于页" }}
        </button>
        <span v-if="siteStore.settingsNotice" class="text-sm text-green-600">
          {{ siteStore.settingsNotice }}
        </span>
        <span v-if="siteStore.settingsError" class="text-sm text-red-600">
          {{ siteStore.settingsError }}
        </span>
      </div>
    </form>
  </div>
</template>
