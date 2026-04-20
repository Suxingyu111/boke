<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as announcementsApi from "@/api/announcements";
import * as backupApi from "@/api/backup";
import * as i18nApi from "@/api/i18n";
import * as seoApi from "@/api/seo";
import { getApiErrorMessage } from "@/api/auth";
import { useCommunityStore } from "@/stores/community";
import { useI18nStore } from "@/stores/i18n";
import { useSiteStore } from "@/stores/site";
import type { SitemapUrl } from "@/api/seo";
import type { AnnouncementRecord } from "@/types/blog";

const siteStore = useSiteStore();
const i18nStore = useI18nStore();
const communityStore = useCommunityStore();

const backups = ref<backupApi.BackupFile[]>([]);
const sitemap = ref<SitemapUrl[]>([]);
const adminAnnouncements = ref<AnnouncementRecord[]>([]);
const notice = ref("");
const errorMessage = ref("");
const loading = ref(false);
const localeForm = reactive({
  locale: i18nStore.locale,
});
const announcementForm = reactive({
  title: "",
  content: "",
  status: "published" as "draft" | "published",
  isPinned: true,
});

const securityItems = [
  {
    title: "SQL 注入",
    detail: "后端 DTO 白名单、TypeORM 参数化查询和前端输入长度限制共同收口。",
    status: "已接入",
  },
  {
    title: "XSS 攻击",
    detail: "Markdown 渲染默认转义 HTML，外链只允许 http、https 和 mailto。",
    status: "已接入",
  },
  {
    title: "CSRF 攻击",
    detail: "非 GET 请求自动携带 X-CSRF-Token 和 X-Requested-With 请求头。",
    status: "已接入",
  },
  {
    title: "暴力破解",
    detail: "登录和注册接口使用 Throttler 速率限制，前端保留明确错误反馈。",
    status: "已接入",
  },
];

const apiGroups = [
  { name: "内容", paths: "GET /articles, GET /articles/:slug, GET /search" },
  { name: "社区", paths: "POST /auth/register, POST /auth/login, GET /users/profile" },
  { name: "收藏", paths: "POST /favorites/:articleId, DELETE /favorites/:articleId" },
  { name: "通知", paths: "GET /notifications, PUT /notifications/read-all" },
  { name: "SEO", paths: "GET /seo/site, GET /seo/sitemap" },
  { name: "备份", paths: "POST /admin/backup, POST /admin/backup/:filename/restore" },
];

const backupSize = computed(() =>
  backups.value.reduce((sum, backup) => sum + backup.size, 0),
);

function formatSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function loadOperations() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [backupList, sitemapUrls] = await Promise.all([
      backupApi.listBackups(),
      seoApi.getSitemap(window.location.origin),
      communityStore.loadPublicCommunity(),
      communityStore.loadAdminVisitorStats(),
    ]);
    backups.value = backupList;
    sitemap.value = sitemapUrls;
    try {
      const announcementPage = await announcementsApi.getAdminAnnouncements();
      adminAnnouncements.value = announcementPage.items;
    } catch {
      adminAnnouncements.value = [];
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      "技术运维接口暂不可用，已展示前端能力清单",
    );
  } finally {
    loading.value = false;
  }
}

async function createBackup() {
  notice.value = "";
  errorMessage.value = "";
  try {
    const backup = await backupApi.createBackup();
    backups.value.unshift(backup);
    notice.value = `备份已创建：${backup.filename}`;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "创建备份失败");
  }
}

async function restoreBackup(filename: string) {
  if (!confirm(`确认从 ${filename} 恢复数据库？恢复前请确保当前数据已有备份。`)) {
    return;
  }

  notice.value = "";
  errorMessage.value = "";
  try {
    const result = await backupApi.restoreBackup(filename);
    notice.value = result.message;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "恢复备份失败");
  }
}

async function deleteBackup(filename: string) {
  if (!confirm(`确认删除备份 ${filename}？`)) {
    return;
  }

  try {
    await backupApi.deleteBackup(filename);
    backups.value = backups.value.filter((backup) => backup.filename !== filename);
    notice.value = `已删除备份：${filename}`;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "删除备份失败");
  }
}

async function saveDefaultLocale() {
  try {
    await i18nApi.setDefaultLocale(localeForm.locale);
    await i18nStore.switchLocale(localeForm.locale);
    notice.value = "默认语言已保存";
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "默认语言保存失败");
  }
}

async function publishAnnouncement() {
  const title = announcementForm.title.trim();
  const content = announcementForm.content.trim();

  if (!title || !content) {
    errorMessage.value = "请填写公告标题和内容。";
    return;
  }

  try {
    const announcement = await announcementsApi.createAnnouncement({
      title,
      content,
      status: announcementForm.status,
      isPinned: announcementForm.isPinned,
    });
    adminAnnouncements.value.unshift(announcement);
    communityStore.announcements.unshift({
      id: announcement.id,
      title,
      content,
      level: announcementForm.isPinned ? "success" : "info",
      publishedAt: announcement.publishedAt ?? new Date().toISOString(),
      isActive: announcementForm.status === "published",
    });
    Object.assign(announcementForm, {
      title: "",
      content: "",
      status: "published",
      isPinned: true,
    });
    notice.value = "公告已发布";
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "公告发布失败");
  }
}

onMounted(() => {
  void loadOperations();
});
</script>

<template>
  <div>
    <p class="eyebrow">Technology</p>
    <h1 class="mt-2 font-display text-5xl text-brand">技术增强</h1>
    <p class="mt-4 max-w-3xl leading-7 text-ink/66">
      SEO、性能、安全、备份、多语言和 REST API 都集中在这里巡检。
    </p>

    <p
      v-if="notice"
      class="mt-6 rounded-md border border-moss/25 bg-moss/10 px-4 py-3 text-sm text-moss"
    >
      {{ notice }}
    </p>
    <p
      v-if="errorMessage"
      class="mt-6 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ errorMessage }}
    </p>

    <div class="mt-8 grid gap-5 xl:grid-cols-3">
      <section class="ui-surface p-5 xl:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="eyebrow">SEO</p>
            <h2 class="mt-2 font-display text-4xl text-brand">搜索元数据</h2>
          </div>
          <RouterLink class="focus-ring ui-button-secondary px-4 py-2" to="/admin/settings">
            编辑站点 SEO
          </RouterLink>
        </div>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-md border border-line bg-paper p-4">
            <p class="text-sm text-ink/56">标题</p>
            <p class="mt-2 font-semibold text-brand">{{ siteStore.settings.title }}</p>
          </div>
          <div class="rounded-md border border-line bg-paper p-4">
            <p class="text-sm text-ink/56">关键词</p>
            <p class="mt-2 text-ink/70">{{ siteStore.settings.keywords }}</p>
          </div>
          <div class="rounded-md border border-line bg-paper p-4 md:col-span-2">
            <p class="text-sm text-ink/56">描述</p>
            <p class="mt-2 text-ink/70">{{ siteStore.settings.description }}</p>
          </div>
        </div>
        <div class="mt-5 overflow-hidden rounded-md border border-line">
          <div
            v-for="url in sitemap.slice(0, 5)"
            :key="url.loc"
            class="grid gap-2 border-b border-line bg-white p-3 text-sm last:border-0 md:grid-cols-[1fr_auto]"
          >
            <span class="break-all text-brand">{{ url.loc }}</span>
            <span class="text-ink/50">{{ url.changefreq }} · {{ url.priority }}</span>
          </div>
          <p v-if="!sitemap.length" class="bg-white p-3 text-sm text-ink/56">
            Sitemap 数据等待接口返回。
          </p>
        </div>
      </section>

      <section class="ui-surface p-5">
        <p class="eyebrow">Performance</p>
        <h2 class="mt-2 font-display text-4xl text-brand">性能策略</h2>
        <div class="mt-5 grid gap-3">
          <p class="rounded-md border border-line bg-paper p-3 text-sm leading-6">
            静态资源 CDN：构建时读取 `VITE_ASSET_CDN` 作为资源基础路径。
          </p>
          <p class="rounded-md border border-line bg-paper p-3 text-sm leading-6">
            页面缓存：GET 请求默认缓存 60 秒，可通过 `VITE_PAGE_CACHE_TTL` 调整。
          </p>
          <p class="rounded-md border border-line bg-paper p-3 text-sm leading-6">
            图片懒加载：非首屏图片使用 `loading="lazy"`，首屏图保留高优先级。
          </p>
        </div>
      </section>
    </div>

    <div class="mt-6 grid gap-5 xl:grid-cols-[1fr_0.78fr]">
      <section class="ui-surface p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="eyebrow">Backup</p>
            <h2 class="mt-2 font-display text-4xl text-brand">备份与恢复</h2>
          </div>
          <button
            class="focus-ring ui-button-primary px-5 py-3"
            :disabled="loading"
            type="button"
            @click="createBackup"
          >
            创建备份
          </button>
        </div>
        <p class="mt-4 text-sm text-ink/56">
          当前共 {{ backups.length }} 个备份，占用 {{ formatSize(backupSize) }}。
        </p>
        <div class="mt-5 grid gap-3">
          <article
            v-for="backup in backups"
            :key="backup.filename"
            class="rounded-md border border-line bg-paper p-4"
          >
            <div class="grid gap-2 md:grid-cols-[1fr_auto]">
              <div>
                <h3 class="break-all font-semibold text-brand">
                  {{ backup.filename }}
                </h3>
                <p class="mt-1 text-sm text-ink/50">
                  {{ formatSize(backup.size) }} ·
                  {{ new Date(backup.createdAt).toLocaleString("zh-CN") }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <a
                  class="focus-ring min-h-9 rounded-md border border-line bg-white px-3 py-2 text-sm hover:border-brand hover:text-brand"
                  :href="backupApi.getBackupDownloadUrl(backup.filename)"
                >
                  下载
                </a>
                <button
                  class="focus-ring min-h-9 rounded-md border border-line bg-white px-3 py-2 text-sm hover:border-moss hover:text-moss"
                  type="button"
                  @click="restoreBackup(backup.filename)"
                >
                  恢复
                </button>
                <button
                  class="focus-ring min-h-9 rounded-md border border-line bg-white px-3 py-2 text-sm hover:border-coral hover:text-coral"
                  type="button"
                  @click="deleteBackup(backup.filename)"
                >
                  删除
                </button>
              </div>
            </div>
          </article>
          <p v-if="!backups.length" class="rounded-md border border-line bg-paper p-4 text-ink/56">
            暂无备份文件。
          </p>
        </div>
      </section>

      <section class="ui-surface p-5">
        <p class="eyebrow">I18n</p>
        <h2 class="mt-2 font-display text-4xl text-brand">多语言</h2>
        <form class="mt-5 grid gap-4" @submit.prevent="saveDefaultLocale">
          <label>
            <span class="text-sm font-semibold text-ink/60">默认语言</span>
            <select
              v-model="localeForm.locale"
              class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
            >
              <option
                v-for="locale in i18nStore.locales"
                :key="locale.code"
                :value="locale.code"
              >
                {{ locale.name }}
              </option>
            </select>
          </label>
          <button class="focus-ring ui-button-secondary w-fit px-5 py-3" type="submit">
            保存默认语言
          </button>
        </form>

        <div class="mt-6 grid gap-3">
          <div
            v-for="item in securityItems"
            :key="item.title"
            class="rounded-md border border-line bg-paper p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold text-brand">{{ item.title }}</h3>
              <span class="rounded-md border border-moss/25 px-2 py-1 text-xs text-moss">
                {{ item.status }}
              </span>
            </div>
            <p class="mt-2 text-sm leading-6 text-ink/62">{{ item.detail }}</p>
          </div>
        </div>
      </section>
    </div>

    <div class="mt-6 grid gap-5 xl:grid-cols-[0.78fr_1fr]">
      <section class="ui-surface p-5">
        <p class="eyebrow">Analytics</p>
        <h2 class="mt-2 font-display text-4xl text-brand">访客统计</h2>
        <div v-if="communityStore.visitorStats" class="mt-5 grid gap-3">
          <div class="grid gap-3 md:grid-cols-3">
            <div class="rounded-md border border-line bg-paper p-3">
              <p class="text-xs text-ink/50">访问量</p>
              <p class="font-display text-3xl text-brand">
                {{ communityStore.visitorStats.totalViews }}
              </p>
            </div>
            <div class="rounded-md border border-line bg-paper p-3">
              <p class="text-xs text-ink/50">访客数</p>
              <p class="font-display text-3xl text-brand">
                {{ communityStore.visitorStats.uniqueVisitors }}
              </p>
            </div>
            <div class="rounded-md border border-line bg-paper p-3">
              <p class="text-xs text-ink/50">平均停留</p>
              <p class="font-display text-3xl text-brand">
                {{ communityStore.visitorStats.avgStaySeconds }}s
              </p>
            </div>
          </div>
          <div
            v-for="source in communityStore.visitorStats.topSources"
            :key="source.source"
            class="flex items-center justify-between rounded-md border border-line bg-white p-3 text-sm"
          >
            <span>{{ source.source }}</span>
            <span class="font-mono text-brand">{{ source.count }}</span>
          </div>
        </div>
      </section>

      <section class="ui-surface p-5">
        <p class="eyebrow">Announcement</p>
        <h2 class="mt-2 font-display text-4xl text-brand">公告栏</h2>
        <form class="mt-5 grid gap-4" @submit.prevent="publishAnnouncement">
          <label>
            <span class="text-sm font-semibold text-ink/60">公告标题</span>
            <input
              v-model="announcementForm.title"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              maxlength="255"
              type="text"
            />
          </label>
          <label>
            <span class="text-sm font-semibold text-ink/60">公告内容</span>
            <textarea
              v-model="announcementForm.content"
              class="focus-ring mt-2 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2"
            ></textarea>
          </label>
          <div class="grid gap-3 md:grid-cols-2">
            <label>
              <span class="text-sm font-semibold text-ink/60">状态</span>
              <select
                v-model="announcementForm.status"
                class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
              >
                <option value="published">立即发布</option>
                <option value="draft">保存草稿</option>
              </select>
            </label>
            <label class="mt-7 flex min-h-11 items-center gap-2 text-sm text-ink/64">
              <input
                v-model="announcementForm.isPinned"
                class="accent-brand"
                type="checkbox"
              />
              置顶公告
            </label>
          </div>
          <button class="focus-ring ui-button-primary w-fit px-5 py-3" type="submit">
            发布公告
          </button>
        </form>
        <div class="mt-5 grid gap-3">
          <article
            v-for="announcement in adminAnnouncements.slice(0, 4)"
            :key="announcement.id"
            class="rounded-md border border-line bg-paper p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-semibold text-brand">{{ announcement.title }}</h3>
              <span class="text-xs text-ink/50">
                {{ announcement.status }}
              </span>
            </div>
            <p class="mt-2 line-clamp-2 text-sm leading-6 text-ink/62">
              {{ announcement.content }}
            </p>
          </article>
        </div>
      </section>
    </div>

    <div class="mt-6">
      <section class="ui-surface p-5">
        <p class="eyebrow">RESTful API</p>
        <h2 class="mt-2 font-display text-4xl text-brand">移动端接口</h2>
        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <div
            v-for="group in apiGroups"
            :key="group.name"
            class="rounded-md border border-line bg-paper p-4"
          >
            <h3 class="font-semibold text-brand">{{ group.name }}</h3>
            <p class="mt-2 font-mono text-xs leading-6 text-ink/62">
              {{ group.paths }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
