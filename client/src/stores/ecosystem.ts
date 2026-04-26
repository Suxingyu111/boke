import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import { request } from "@/api/http";

interface ArchiveMonth {
  year: number;
  month: number;
  count: number;
  articles: ArchiveArticle[];
}

interface ArchiveArticle {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  excerpt?: string | null;
  content?: string;
  viewCount?: number;
}

interface SearchMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  contentHighlight?: string | null;
  publishedAt?: string | null;
  viewCount?: number;
  score?: number;
  category?: { id: string; name: string; slug: string } | null;
}

function asRecord(v: unknown) {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function mapArchiveMonth(raw: unknown): ArchiveMonth {
  const r = asRecord(raw) ?? {};
  return {
    year: asNumber(r.year),
    month: asNumber(r.month),
    count: asNumber(r.count),
    articles: [],
  };
}

function mapArchiveArticle(raw: unknown): ArchiveArticle {
  const r = asRecord(raw) ?? {};
  return {
    id: asString(r.id, "unknown"),
    title: asString(r.title, "无标题"),
    slug: asString(r.slug, ""),
    publishedAt: asString(r.publishedAt ?? r.createdAt, new Date().toISOString()),
    excerpt: typeof r.excerpt === "string" ? r.excerpt : null,
    content: typeof r.content === "string" ? r.content : undefined,
    viewCount: typeof r.viewCount === "number" ? r.viewCount : undefined,
  };
}

function mapSearchResult(raw: unknown): SearchResult {
  const r = asRecord(raw) ?? {};
  const cat = asRecord(r.category);
  return {
    id: asString(r.id),
    title: asString(r.title, "无标题"),
    slug: asString(r.slug),
    excerpt: typeof r.excerpt === "string" ? r.excerpt : null,
    contentHighlight:
      typeof r.contentHighlight === "string" ? r.contentHighlight : null,
    publishedAt: typeof r.publishedAt === "string" ? r.publishedAt : null,
    viewCount: typeof r.viewCount === "number" ? r.viewCount : undefined,
    score: typeof r.score === "number" ? r.score : undefined,
    category: cat
      ? { id: asString(cat.id), name: asString(cat.name), slug: asString(cat.slug) }
      : null,
  };
}

export const useEcosystemStore = defineStore("ecosystem", {
  state: () => ({
    // Archives
    archiveMonths: [] as ArchiveMonth[],
    selectedArchive: null as ArchiveMonth | null,
    archivePagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 } as SearchMeta,
    // Search
    searchResults: [] as SearchResult[],
    searchMeta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } as SearchMeta,
    // Status
    loading: false,
    errorMessage: "",
    notice: "",
  }),
  actions: {
    async loadArchives() {
      this.loading = true;
      this.errorMessage = "";
      try {
        const res = await request<unknown[]>("/archives");
        const items = Array.isArray(res.data) ? res.data : [];
        this.archiveMonths = items.map(mapArchiveMonth);
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "归档加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadArchiveArticles(year: number, month: number, page = 1) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const res = await request<unknown>("/archives/articles", { year, month, page, pageSize: 10 });
        // Backend returns ArchiveGroup: { year, month, total, page, pageSize, totalPages, articles: [...] }
        const data = asRecord(res.data);
        const items: unknown[] = Array.isArray(data?.articles)
          ? (data!.articles as unknown[])
          : Array.isArray(res.data)
            ? (res.data as unknown[])
            : [];
        const articles = items.map(mapArchiveArticle);
        this.archivePagination = {
          total: asNumber(data?.total),
          page: asNumber(data?.page, page),
          pageSize: asNumber(data?.pageSize, 10),
          totalPages: asNumber(data?.totalPages),
        };
        const target = this.archiveMonths.find(
          (m) => m.year === year && m.month === month,
        );
        if (target) {
          target.articles = articles;
          this.selectedArchive = target;
        } else {
          const synthetic: ArchiveMonth = { year, month, count: articles.length, articles };
          this.archiveMonths.push(synthetic);
          this.selectedArchive = synthetic;
        }
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "归档文章加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async searchArticles(params: {
      keyword?: string;
      page?: number;
      pageSize?: number;
      categoryId?: string;
      tagId?: string;
    }) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const res = await request<{ items?: unknown[]; meta?: unknown } | unknown[]>(
          "/search",
          params,
        );
        const data = res.data as Record<string, unknown>;
        const items = Array.isArray(data.items) ? data.items : Array.isArray(res.data) ? (res.data as unknown[]) : [];
        const meta = asRecord(data.meta);
        this.searchResults = items.map(mapSearchResult);
        this.searchMeta = {
          total: asNumber(meta?.total, asNumber(data.total)),
          page: asNumber(meta?.page, asNumber(data.page, 1)),
          pageSize: asNumber(meta?.pageSize, asNumber(data.pageSize, 20)),
          totalPages: asNumber(meta?.totalPages, asNumber(data.totalPages)),
        };
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "搜索失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
