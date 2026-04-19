import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import { request, post } from "@/api/http";

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
  publishedAt?: string | null;
  viewCount?: number;
  category?: { id: string; name: string; slug: string } | null;
}

interface PaidInfo {
  isPaid: boolean;
  price: number;
  description?: string | null;
}

interface PaidContent {
  content: string;
  contentHtml?: string | null;
  isPaid: boolean;
  hasAccess: boolean;
  price?: number | null;
}

interface Purchase {
  id: string;
  articleId: string;
  articleTitle?: string;
  articleSlug?: string;
  purchasedAt: string;
  price: number;
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

function asBoolean(v: unknown, fallback = false) {
  return typeof v === "boolean" ? v : fallback;
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
    publishedAt: typeof r.publishedAt === "string" ? r.publishedAt : null,
    viewCount: typeof r.viewCount === "number" ? r.viewCount : undefined,
    category: cat
      ? { id: asString(cat.id), name: asString(cat.name), slug: asString(cat.slug) }
      : null,
  };
}

function mapPurchase(raw: unknown): Purchase {
  const r = asRecord(raw) ?? {};
  const article = asRecord(r.article);
  return {
    id: asString(r.id),
    articleId: asString(r.articleId ?? article?.id),
    articleTitle: article ? asString(article.title) : undefined,
    articleSlug: article ? asString(article.slug) : undefined,
    purchasedAt: asString(r.purchasedAt ?? r.createdAt, new Date().toISOString()),
    price: asNumber(r.price ?? r.amount),
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
    // Paid content
    paidContent: null as PaidContent | null,
    paidInfo: null as PaidInfo | null,
    // Profile
    myPurchases: [] as Purchase[],
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
          total: asNumber(meta?.total),
          page: asNumber(meta?.page, 1),
          pageSize: asNumber(meta?.pageSize, 20),
          totalPages: asNumber(meta?.totalPages),
        };
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "搜索失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadPaidArticle(articleId: string) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const [infoRes, contentRes] = await Promise.all([
          request<unknown>(`/paid-content/${articleId}/info`),
          request<unknown>(`/paid-content/${articleId}/content`),
        ]);
        const info = asRecord(infoRes.data) ?? {};
        const content = asRecord(contentRes.data) ?? {};
        this.paidInfo = {
          isPaid: asBoolean(info.isPaid),
          price: asNumber(info.price),
          description: typeof info.description === "string" ? info.description : null,
        };
        this.paidContent = {
          content: asString(content.content ?? content.contentHtml),
          contentHtml: typeof content.contentHtml === "string" ? content.contentHtml : null,
          isPaid: asBoolean(content.isPaid ?? info.isPaid),
          hasAccess: asBoolean(content.hasAccess, true),
          price: typeof content.price === "number" ? content.price : asNumber(info.price),
        };
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "付费内容加载失败");
      } finally {
        this.loading = false;
      }
    },
    async purchaseArticle(articleId: string) {
      this.loading = true;
      this.notice = "";
      this.errorMessage = "";
      try {
        await post("/paid-content/purchase", { articleId });
        this.notice = "购买成功！";
        if (this.paidContent) {
          this.paidContent.hasAccess = true;
        }
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "购买失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadMyPurchases() {
      this.loading = true;
      this.errorMessage = "";
      try {
        const res = await request<unknown[]>("/paid-content/my-purchases");
        const items = Array.isArray(res.data) ? res.data : [];
        this.myPurchases = items.map(mapPurchase);
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "购买记录加载失败");
      } finally {
        this.loading = false;
      }
    },
  },
});
