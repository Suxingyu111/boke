import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as pagesApi from "@/api/pages";
import type {
  CustomPage,
  FriendLink,
  FriendLinkStatus,
  PageStatus,
  PageType,
} from "@/types/blog";
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

export interface FriendLinkMutationPayload {
  id?: string;
  siteName: string;
  siteUrl: string;
  logoUrl: string;
  description: string;
  contactEmail: string;
  applicantName: string;
  sortOrder: number;
  status: FriendLinkStatus;
}

export interface FriendLinkApplicationPayload {
  siteName: string;
  siteUrl: string;
  description: string;
  contactEmail: string;
  applicantName: string;
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

function getNumber(source: Record<string, unknown>, key: string, fallback = 0) {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function normalizeFriendLinkStatus(value: unknown): FriendLinkStatus {
  return value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "offline"
    ? value
    : "approved";
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

function mapFriendLink(raw: unknown): FriendLink {
  if (!isRecord(raw)) {
    return {
      id: "link-unknown",
      siteName: "未命名站点",
      siteUrl: "#",
      logoUrl: null,
      description: null,
      contactEmail: null,
      applicantName: null,
      sortOrder: 0,
      status: "pending",
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const createdAt = getDateString(raw, "createdAt", new Date().toISOString());
  const updatedAt = getDateString(raw, "updatedAt", createdAt);

  return {
    id: getString(raw, "id", "link-unknown"),
    siteName: getString(raw, "siteName", "未命名站点"),
    siteUrl: getString(raw, "siteUrl", "#"),
    logoUrl: getNullableString(raw, "logoUrl"),
    description: getNullableString(raw, "description"),
    contactEmail: getNullableString(raw, "contactEmail"),
    applicantName: getNullableString(raw, "applicantName"),
    sortOrder: getNumber(raw, "sortOrder"),
    status: normalizeFriendLinkStatus(raw.status),
    approvedAt: getDateString(raw, "approvedAt", "") || null,
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

function sortFriendLinks(links: FriendLink[]) {
  return [...links].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.siteName.localeCompare(right.siteName, "zh-CN");
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

function buildFriendLinkRequest(
  payload: FriendLinkMutationPayload,
): pagesApi.FriendLinkPayload {
  return {
    siteName: payload.siteName,
    siteUrl: payload.siteUrl,
    logoUrl: payload.logoUrl || undefined,
    description: payload.description || undefined,
    contactEmail: payload.contactEmail || undefined,
    applicantName: payload.applicantName || undefined,
    sortOrder: payload.sortOrder,
    status: payload.status,
  };
}

export const usePagesStore = defineStore("pages", {
  state: () => ({
    pages: [] as CustomPage[],
    friendLinks: [] as FriendLink[],
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
    approvedLinks: (state) =>
      sortFriendLinks(
        state.friendLinks.filter((link) => link.status === "approved"),
      ),
    adminPages: (state) => sortPages(state.pages),
    adminFriendLinks: (state) => sortFriendLinks(state.friendLinks),
  },
  actions: {
    upsertPage(page: CustomPage) {
      upsertById(this.pages, page);
    },
    upsertFriendLink(link: FriendLink) {
      upsertById(this.friendLinks, link);
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
    async loadPublicFriendLinks() {
      this.loading = true;
      this.errorMessage = "";
      try {
        const links = await pagesApi.getPublicFriendLinks();
        this.friendLinks = links.map(mapFriendLink);
        this.apiReady = true;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "友情链接暂不可用");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadAdminPages() {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const [pages, links] = await Promise.all([
          pagesApi.getAdminPages(),
          pagesApi.getAdminFriendLinks(),
        ]);
        this.pages = pages.map(mapPage);
        this.friendLinks = links.map(mapFriendLink);
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
    async loadAdminFriendLinkDetail(id: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const link = mapFriendLink(await pagesApi.getAdminFriendLink(id));
        this.upsertFriendLink(link);
        this.apiReady = true;
        return link;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "友链详情加载失败");
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
    async saveFriendLink(payload: FriendLinkMutationPayload) {
      const requestPayload = buildFriendLinkRequest(payload);
      const link = mapFriendLink(
        payload.id
          ? await pagesApi.updateFriendLink(payload.id, requestPayload)
          : await pagesApi.createFriendLink(requestPayload),
      );
      this.upsertFriendLink(link);
      await this.loadAdminPages();
      return link;
    },
    async deleteFriendLink(id: string) {
      await pagesApi.deleteFriendLink(id);
      this.friendLinks = this.friendLinks.filter((link) => link.id !== id);
      await this.loadAdminPages();
    },
    async applyFriendLink(payload: FriendLinkApplicationPayload) {
      const link = mapFriendLink(
        await pagesApi.applyFriendLink({
          siteName: payload.siteName,
          siteUrl: payload.siteUrl,
          description: payload.description || undefined,
          contactEmail: payload.contactEmail || undefined,
          applicantName: payload.applicantName || undefined,
        }),
      );
      this.upsertFriendLink(link);
      return link;
    },
  },
});
