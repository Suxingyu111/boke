import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as pagesApi from "@/api/pages";
import type { CustomPage, PageStatus, PageType } from "@/types/blog";
import { renderMarkdown } from "@/utils/markdown";

export interface PageMutationPayload {
  id?: string;
  title: string;
  slug: string;
  pageType: PageType;
  content: string;
  summary: string;
  isHomeVisible: boolean;
  status: PageStatus;
  seoTitle: string;
  seoDescription: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(
  source: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
}

function getBoolean(
  source: Record<string, unknown>,
  key: string,
  fallback = false,
) {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
}

function getDateString(
  source: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = source[key];
  if (typeof value !== "string" || !value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getNullableString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizePageType(value: unknown): PageType {
  return value === "about" ||
    value === "custom" ||
    value === "resume" ||
    value === "portfolio"
    ? value
    : "custom";
}

function normalizePageStatus(value: unknown): PageStatus {
  return value === "published" ? value : "draft";
}

function mapPage(raw: unknown): CustomPage {
  if (!isRecord(raw)) {
    return {
      id: "page-unknown",
      title: "未命名页面",
      slug: "untitled",
      pageType: "custom",
      content: "",
      contentHtml: null,
      summary: null,
      isHomeVisible: false,
      status: "draft",
      seoTitle: null,
      seoDescription: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const createdAt = getDateString(raw, "createdAt", new Date().toISOString());
  const updatedAt = getDateString(raw, "updatedAt", createdAt);

  return {
    id: getString(raw, "id", "page-unknown"),
    title: getString(raw, "title", "未命名页面"),
    slug: getString(raw, "slug", "untitled"),
    pageType: normalizePageType(raw.pageType),
    content: getString(raw, "content", ""),
    contentHtml: getNullableString(raw, "contentHtml"),
    summary: getNullableString(raw, "summary"),
    isHomeVisible: getBoolean(raw, "isHomeVisible"),
    status: normalizePageStatus(raw.status),
    seoTitle: getNullableString(raw, "seoTitle"),
    seoDescription: getNullableString(raw, "seoDescription"),
    publishedAt: getDateString(raw, "publishedAt", "") || null,
    createdAt,
    updatedAt,
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) {
    items.unshift(item);
    return;
  }

  items.splice(index, 1, item);
}

function sortPages(pages: CustomPage[]) {
  return [...pages].sort((left, right) => {
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function buildPageRequest(payload: PageMutationPayload): pagesApi.PagePayload {
  return {
    title: payload.title,
    slug: payload.slug,
    pageType: payload.pageType,
    content: payload.content,
    contentHtml: renderMarkdown(payload.content),
    summary: payload.summary || undefined,
    isHomeVisible: payload.isHomeVisible,
    status: payload.status,
    seoTitle: payload.seoTitle || undefined,
    seoDescription: payload.seoDescription || undefined,
  };
}

export const usePagesStore = defineStore("pages", {
  state: () => ({
    pages: [] as CustomPage[],
    loading: false,
    adminLoading: false,
    errorMessage: "",
    apiReady: false,
  }),
  getters: {
    aboutPage: (state) =>
      state.pages.find(
        (page) => page.pageType === "about" && page.status === "published",
      ),
    publishedPages: (state) =>
      sortPages(state.pages).filter((page) => page.status === "published"),
    visibleCustomPages: (state) =>
      sortPages(state.pages).filter(
        (page) =>
          page.status === "published" &&
          page.isHomeVisible &&
          page.pageType !== "about",
      ),
    adminPages: (state) => sortPages(state.pages),
  },
  actions: {
    upsertPage(page: CustomPage) {
      upsertById(this.pages, page);
    },
    async loadAboutPage() {
      this.loading = true;
      this.errorMessage = "";
      try {
        const page = mapPage(await pagesApi.getPublicAboutPage());
        this.upsertPage(page);
        this.apiReady = true;
        return page;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "关于我页面暂不可用");
        return this.aboutPage;
      } finally {
        this.loading = false;
      }
    },
    async loadPublicPage(slug: string) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const page = mapPage(await pagesApi.getPublicPage(slug));
        this.upsertPage(page);
        this.apiReady = true;
        return page;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "页面暂不可用");
        return this.publishedPages.find((page) => page.slug === slug);
      } finally {
        this.loading = false;
      }
    },
    async loadAdminPages() {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const pages = await pagesApi.getAdminPages();
        this.pages = pages.map(mapPage);
        this.apiReady = true;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "页面管理接口加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async loadAdminPageDetail(id: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const page = mapPage(await pagesApi.getAdminPage(id));
        this.upsertPage(page);
        this.apiReady = true;
        return page;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "页面详情加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async savePage(payload: PageMutationPayload) {
      const requestPayload = buildPageRequest(payload);
      const page = mapPage(
        payload.id
          ? await pagesApi.updatePage(payload.id, requestPayload)
          : await pagesApi.createPage(requestPayload),
      );
      this.upsertPage(page);
      await this.loadAdminPages();
      return page;
    },
    async deletePage(id: string) {
      await pagesApi.deletePage(id);
      this.pages = this.pages.filter((page) => page.id !== id);
      await this.loadAdminPages();
    },
  },
});
