import { defineStore } from "pinia";
import * as dashboardApi from "@/api/dashboard";
import * as seoApi from "@/api/seo";
import * as settingsApi from "@/api/settings";
import { getApiErrorMessage } from "@/api/auth";
import { useContentStore } from "@/stores/content";
import type {
  AboutSettings,
  ArticleStatus,
  SiteSettings,
  SiteStats,
  SocialLink,
  TimelineItem,
} from "@/types/blog";

const localSettingsKey = "blog_site_settings";
const defaultSiteSettings: SiteSettings = {
  title: "",
  subtitle: "",
  description: "",
  keywords: "",
  author: "",
  logo: "/favicon.svg",
  favicon: "/favicon.svg",
  ogImage: "",
  icp: "",
  copyright: "",
  socialLinks: [],
};

const defaultAboutSettings: AboutSettings = {
  techStack: [],
  timeline: [],
  contactEmail: "",
  githubUrl: "",
};

function normalizeTimelineItem(raw: unknown): TimelineItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as Record<string, unknown>;
  const year = typeof source.year === "string" ? source.year.trim() : "";
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const desc = typeof source.desc === "string" ? source.desc.trim() : "";
  return year && title ? { year, title, desc } : null;
}

function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return (raw ?? fallback) as T;
}

function normalizeAboutSettings(raw: unknown): AboutSettings {
  if (typeof raw !== "object" || raw === null) {
    return { ...defaultAboutSettings };
  }
  const source = raw as Record<string, unknown>;

  const rawStack = parseJsonField<unknown[]>(source["about_tech_stack"], []);
  const techStack = Array.isArray(rawStack)
    ? rawStack.filter((item): item is string => typeof item === "string")
    : [];

  const rawTimeline = parseJsonField<unknown[]>(source["about_timeline"], []);
  const timeline = Array.isArray(rawTimeline)
    ? rawTimeline.map(normalizeTimelineItem).filter((item): item is TimelineItem => item !== null)
    : [];

  const contactEmail =
    typeof source["about_contact_email"] === "string"
      ? source["about_contact_email"]
      : "";
  const githubUrl =
    typeof source["about_github_url"] === "string"
      ? source["about_github_url"]
      : "";

  return { techStack, timeline, contactEmail, githubUrl };
}

function readLocalSettings(): Partial<SiteSettings> {
  const value = localStorage.getItem(localSettingsKey);
  if (!value) {
    return {};
  }

  try {
    return normalizeSettings(JSON.parse(value), defaultSiteSettings);
  } catch {
    return {};
  }
}

function getStringSetting(
  source: Record<string, unknown>,
  keys: string[],
  fallback: string,
) {
  const value = keys
    .map((key) => source[key])
    .find((item) => item !== undefined);
  return typeof value === "string" ? value : fallback;
}

function normalizeSocialLinks(
  value: unknown,
  fallback: SocialLink[],
): SocialLink[] {
  if (typeof value === "string") {
    try {
      return normalizeSocialLinks(JSON.parse(value), fallback);
    } catch {
      return [...fallback];
    }
  }

  if (!Array.isArray(value)) {
    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, url]) => {
          if (typeof url !== "string" || !url.trim()) {
            return null;
          }

          return {
            label: key
              .replace(/^social_/i, "")
              .replace(/[_-]+/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()),
            url: url.trim(),
          };
        })
        .filter((item): item is SocialLink => item !== null);

      return entries.length ? entries : [...fallback];
    }

    return [...fallback];
  }

  const links = value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const source = item as Record<string, unknown>;
      const label =
        typeof source.label === "string"
          ? source.label
          : typeof source.name === "string"
            ? source.name
            : "";
      const url = typeof source.url === "string" ? source.url : "";

      return label.trim() && url.trim()
        ? { label: label.trim(), url: url.trim() }
        : null;
    })
    .filter((item): item is SocialLink => item !== null);

  return links;
}

function normalizeSettings(
  value: unknown,
  fallback: SiteSettings,
): SiteSettings {
  if (typeof value !== "object" || value === null) {
    return { ...fallback };
  }

  const source = value as Record<string, unknown>;
  return {
    title: getStringSetting(
      source,
      ["site_title", "title", "siteTitle", "blogTitle"],
      fallback.title,
    ),
    subtitle: getStringSetting(
      source,
      ["site_subtitle", "subtitle", "siteSubtitle"],
      fallback.subtitle,
    ),
    description: getStringSetting(
      source,
      ["site_description", "description", "siteDescription"],
      fallback.description,
    ),
    keywords: getStringSetting(
      source,
      ["site_keywords", "keywords", "seoKeywords", "siteKeywords"],
      fallback.keywords,
    ),
    author: getStringSetting(
      source,
      ["site_author", "author", "siteAuthor"],
      fallback.author,
    ),
    logo: getStringSetting(
      source,
      ["site_logo", "logo", "siteLogo"],
      fallback.logo,
    ),
    favicon: getStringSetting(
      source,
      ["site_favicon", "favicon", "siteFavicon"],
      fallback.favicon,
    ),
    ogImage: getStringSetting(
      source,
      ["og_image", "ogImage", "siteOgImage"],
      fallback.ogImage,
    ),
    icp: getStringSetting(
      source,
      ["site_icp", "icp", "icpNumber", "beian"],
      fallback.icp,
    ),
    copyright: getStringSetting(
      source,
      ["site_copyright", "copyright"],
      fallback.copyright,
    ),
    socialLinks: normalizeSocialLinks(
      source.social_links ?? source.socialLinks,
      fallback.socialLinks,
    ),
  };
}

function normalizeStats(value: dashboardApi.DashboardStatsResponse): SiteStats {
  return {
    articles: value.articleCount,
    views: value.totalViewCount,
    comments: value.totalCommentCount,
  };
}

export interface DashboardRecentArticle {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  viewCount: number;
  commentCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export const useSiteStore = defineStore("site", {
  state: () => ({
    settings: {
      ...defaultSiteSettings,
      ...readLocalSettings(),
    },
    aboutSettings: { ...defaultAboutSettings } as AboutSettings,
    dashboardStats: null as SiteStats | null,
    recentArticles: [] as DashboardRecentArticle[],
    settingsLoading: false,
    settingsSaving: false,
    aboutSettingsSaving: false,
    statsLoading: false,
    recentArticlesLoading: false,
    settingsError: "",
    settingsNotice: "",
    aboutSettingsNotice: "",
    aboutSettingsError: "",
    statsError: "",
    recentArticlesError: "",
  }),
  getters: {
    stats: (state): SiteStats =>
      state.dashboardStats ?? useContentStore().stats,
  },
  actions: {
    applySettings(settings: SiteSettings) {
      this.settings = { ...settings };
      localStorage.setItem(localSettingsKey, JSON.stringify(this.settings));
    },
    async loadPublicSettings() {
      this.settingsLoading = true;
      this.settingsError = "";
      try {
        const [publicSettings, siteSeoSettings] = await Promise.allSettled([
          settingsApi.getPublicSettings(),
          seoApi.getSiteSeoSettings(),
        ]);
        const mergedSettings = {
          ...(publicSettings.status === "fulfilled" ? publicSettings.value : {}),
          ...(siteSeoSettings.status === "fulfilled" ? siteSeoSettings.value : {}),
        };
        const settings = normalizeSettings(mergedSettings, this.settings);
        this.applySettings(settings);
        this.aboutSettings = normalizeAboutSettings(mergedSettings);
      } catch (error) {
        this.settingsError = getApiErrorMessage(
          error,
          "站点设置接口暂不可用，已使用本地配置",
        );
      } finally {
        this.settingsLoading = false;
      }
    },
    async loadAdminSettings() {
      this.settingsLoading = true;
      this.settingsError = "";
      try {
        const raw = await settingsApi.getAdminSettings();
        const settings = normalizeSettings(raw, this.settings);
        this.applySettings(settings);
        this.aboutSettings = normalizeAboutSettings(raw);
      } catch (error) {
        this.settingsError = getApiErrorMessage(
          error,
          "设置读取失败，已保留当前表单内容",
        );
      } finally {
        this.settingsLoading = false;
      }
    },
    async saveSettings(settings: SiteSettings) {
      this.settingsSaving = true;
      this.settingsError = "";
      this.settingsNotice = "";
      const nextSettings = normalizeSettings(settings, this.settings);

      try {
        const savedSettings = normalizeSettings(
          await settingsApi.saveSettings(nextSettings),
          nextSettings,
        );
        this.applySettings(savedSettings);
        this.settingsNotice = "设置已保存";
        return true;
      } catch (error) {
        this.settingsError = getApiErrorMessage(
          error,
          "设置保存失败，请检查接口或登录状态",
        );
        return false;
      } finally {
        this.settingsSaving = false;
      }
    },
    async saveAboutSettings(settings: AboutSettings) {
      this.aboutSettingsSaving = true;
      this.aboutSettingsError = "";
      this.aboutSettingsNotice = "";
      try {
        const raw = await settingsApi.saveAboutSettings(settings);
        this.aboutSettings = normalizeAboutSettings(raw);
        this.aboutSettingsNotice = "关于页信息已保存";
        return true;
      } catch (error) {
        this.aboutSettingsError = getApiErrorMessage(error, "关于页信息保存失败");
        return false;
      } finally {
        this.aboutSettingsSaving = false;
      }
    },
    async loadDashboardStats() {
      this.statsLoading = true;
      this.statsError = "";
      try {
        this.dashboardStats = normalizeStats(
          await dashboardApi.getDashboardStats(),
        );
      } catch (error) {
        this.dashboardStats = null;
        this.statsError = getApiErrorMessage(
          error,
          "仪表盘统计接口暂不可用，已按当前内容估算",
        );
      } finally {
        this.statsLoading = false;
      }
    },
    async loadRecentArticles(limit = 5) {
      this.recentArticlesLoading = true;
      this.recentArticlesError = "";
      try {
        this.recentArticles = await dashboardApi.getRecentArticles(limit);
      } catch (error) {
        this.recentArticles = [];
        this.recentArticlesError = getApiErrorMessage(
          error,
          "最近文章接口暂不可用，已使用文章列表兜底",
        );
      } finally {
        this.recentArticlesLoading = false;
      }
    },
  },
});
