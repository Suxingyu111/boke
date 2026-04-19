import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as contentApi from "@/api/content";
import type {
  Article,
  ArticleStatus,
  Author,
  Category,
  SiteStats,
  Tag,
} from "@/types/blog";
import { renderMarkdown } from "@/utils/markdown";

const defaultCover =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80";

export interface ArticleMutationPayload {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  tagIds: string[];
  status: ArticleStatus;
  publishedAt?: string;
  scheduledAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface CategoryMutationPayload {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  color: string;
}

export interface TagMutationPayload {
  id?: string;
  name: string;
  slug?: string;
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

function normalizeStatus(value: unknown): ArticleStatus {
  return value === "draft" ||
    value === "scheduled" ||
    value === "published" ||
    value === "archived"
    ? value
    : "draft";
}

export function createSlug(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function uniqueSlug(
  slug: string,
  items: { id: string; slug: string }[],
  id = "",
) {
  const existing = new Set(
    items.filter((item) => item.id !== id).map((item) => item.slug),
  );

  if (!existing.has(slug)) {
    return slug;
  }

  let index = 2;
  let next = `${slug}-${index}`;
  while (existing.has(next)) {
    index += 1;
    next = `${slug}-${index}`;
  }

  return next;
}

function fallbackCategory(): Category {
  return {
    id: "cat-uncategorized",
    name: "未分类",
    slug: "uncategorized",
    description: "暂未归档的文章。",
    articleCount: 0,
    color: "#255f85",
  };
}

function mapCategory(raw: unknown): Category {
  if (!isRecord(raw)) {
    return fallbackCategory();
  }

  return {
    id: getString(raw, "id", "cat-unknown"),
    name: getString(raw, "name", "未分类"),
    slug: getString(raw, "slug", "uncategorized"),
    description: getString(raw, "description", ""),
    articleCount: getNumber(raw, "articleCount"),
    color: getString(raw, "color", "#185c52"),
  };
}

function mapTag(raw: unknown): Tag {
  if (!isRecord(raw)) {
    return {
      id: "tag-unknown",
      name: "未命名",
      slug: "untagged",
      articleCount: 0,
    };
  }

  return {
    id: getString(raw, "id", "tag-unknown"),
    name: getString(raw, "name", "未命名"),
    slug: getString(raw, "slug", "untagged"),
    articleCount: getNumber(raw, "articleCount"),
  };
}

export function mapArticle(raw: unknown): Article {
  if (!isRecord(raw)) {
    return {
      id: "article-unknown",
      title: "未命名文章",
      slug: "untitled",
      excerpt: "",
      content: "",
      contentHtml: "",
      coverImage: defaultCover,
      status: "draft",
      allowComment: true,
      viewCount: 0,
      likes: 0,
      commentCount: 0,
      author: fallbackAuthor(),
      category: fallbackCategory(),
      tags: [],
      publishedAt: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const category = mapCategory(raw.category);
  const tags = Array.isArray(raw.tags) ? raw.tags.map(mapTag) : [];
  const createdAt = getDateString(raw, "createdAt", new Date().toISOString());
  const updatedAt = getDateString(raw, "updatedAt", createdAt);
  const publishedAt = getDateString(raw, "publishedAt", "");
  const scheduledAt = getDateString(raw, "scheduledAt", "");
  const deletedAt = getDateString(raw, "deletedAt", "");

  return {
    id: getString(raw, "id", "article-unknown"),
    title: getString(raw, "title", "未命名文章"),
    slug: getString(raw, "slug", "untitled"),
    excerpt: getString(raw, "excerpt", ""),
    content: getString(raw, "content", ""),
    contentHtml: getString(raw, "contentHtml", ""),
    coverImage: getString(raw, "coverImage", defaultCover) || defaultCover,
    status: normalizeStatus(raw.status),
    allowComment: getBoolean(raw, "allowComment", true),
    viewCount: getNumber(raw, "viewCount"),
    likes: getNumber(raw, "likes"),
    commentCount: getNumber(raw, "commentCount"),
    author: mapAuthor(raw.author),
    category,
    tags,
    publishedAt,
    scheduledAt: scheduledAt || undefined,
    deletedAt: deletedAt || undefined,
    seoTitle: getString(raw, "seoTitle", "") || null,
    seoDescription: getString(raw, "seoDescription", "") || null,
    seoKeywords: getString(raw, "seoKeywords", "") || null,
    createdAt,
    updatedAt,
  };
}

function fallbackAuthor(): Author {
  return {
    id: "author-unknown",
    username: "unknown",
    nickname: "作者",
    avatar: undefined,
    bio: undefined,
    role: "author",
  };
}

function mapAuthor(raw: unknown): Author {
  if (!isRecord(raw)) {
    return fallbackAuthor();
  }

  const role = raw.role;
  return {
    id: getString(raw, "id", "author-unknown"),
    username: getString(raw, "username", "unknown"),
    nickname: getString(raw, "nickname", getString(raw, "username", "作者")),
    avatar: getString(raw, "avatar", "") || undefined,
    bio: getString(raw, "bio", "") || undefined,
    role:
      role === "super_admin" ||
      role === "admin" ||
      role === "author" ||
      role === "user"
        ? role
        : "author",
  };
}

function sortByPublishedAt(articles: Article[]) {
  return [...articles].sort((a, b) => {
    const aDate = a.publishedAt || a.scheduledAt || a.updatedAt || a.createdAt;
    const bDate = b.publishedAt || b.scheduledAt || b.updatedAt || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

function buildArticleRequest(
  payload: ArticleMutationPayload,
  articles: Article[],
): contentApi.ArticlePayload {
  const slug = uniqueSlug(
    createSlug(
      payload.slug || payload.title,
      payload.id || `article-${Date.now().toString(36)}`,
    ),
    articles,
    payload.id,
  );

  return {
    title: payload.title,
    slug,
    excerpt: payload.excerpt,
    content: payload.content,
    contentHtml: renderMarkdown(payload.content),
    coverImage: payload.coverImage || defaultCover,
    categoryId: payload.categoryId,
    tagIds: payload.tagIds,
    status: payload.status,
    visibility: "public",
    allowComment: true,
    isTop: false,
    sortOrder: 0,
    seoTitle: payload.seoTitle,
    seoDescription: payload.seoDescription,
    seoKeywords: payload.seoKeywords,
    scheduledAt:
      payload.status === "scheduled" ? payload.scheduledAt : undefined,
  };
}

function buildCategoryRequest(
  payload: CategoryMutationPayload,
  categories: Category[],
): contentApi.CategoryPayload {
  return {
    name: payload.name,
    slug: uniqueSlug(
      createSlug(
        payload.slug || payload.name,
        payload.id || `category-${Date.now().toString(36)}`,
      ),
      categories,
      payload.id,
    ),
    description: payload.description,
    color: payload.color || "#185c52",
    isVisible: true,
    sortOrder: 0,
  };
}

function buildTagRequest(
  payload: TagMutationPayload,
  tags: Tag[],
): contentApi.TagPayload {
  return {
    name: payload.name,
    slug: uniqueSlug(
      createSlug(
        payload.slug || payload.name,
        payload.id || `tag-${Date.now().toString(36)}`,
      ),
      tags,
      payload.id,
    ),
  };
}

export const useContentStore = defineStore("content", {
  state: () => ({
    articles: [] as Article[],
    categories: [] as Category[],
    tags: [] as Tag[],
    publicMeta: {
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    } as contentApi.PaginationMeta,
    adminMeta: {
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    } as contentApi.PaginationMeta,
    loading: false,
    adminLoading: false,
    errorMessage: "",
    apiReady: false,
  }),
  getters: {
    publishedArticles: (state) =>
      sortByPublishedAt(
        state.articles.filter((article) => article.status === "published"),
      ),
    visibleCategories: (state) =>
      [...state.categories].sort((a, b) => b.articleCount - a.articleCount),
    tagCloud: (state) =>
      [...state.tags].sort((a, b) => b.articleCount - a.articleCount),
    stats: (state): SiteStats => ({
      articles: state.articles.filter(
        (article) => article.status !== "archived",
      ).length,
      views: state.articles.reduce(
        (sum, article) => sum + article.viewCount,
        0,
      ),
      comments: state.articles.reduce(
        (sum, article) => sum + article.commentCount,
        0,
      ),
    }),
  },
  actions: {
    upsertArticle(article: Article) {
      const index = this.articles.findIndex((item) => item.id === article.id);
      if (index === -1) {
        this.articles.unshift(article);
        return;
      }

      this.articles.splice(index, 1, article);
    },
    async loadPublicContent(query: contentApi.ArticleQuery = {}) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const [articlePage, categories, tags] = await Promise.all([
          contentApi.getPublicArticles({
            page: 1,
            pageSize: 50,
            sortBy: "publishedAt",
            order: "DESC",
            ...query,
          }),
          contentApi.getPublicCategories(),
          contentApi.getPublicTags(),
        ]);

        this.articles = articlePage.items.map(mapArticle);
        this.publicMeta = articlePage.meta;
        this.categories = categories.map(mapCategory);
        this.tags = tags.map(mapTag);
        this.apiReady = true;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "内容接口暂不可用");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadPublicArticleDetail(slug: string) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const article = mapArticle(await contentApi.getPublicArticle(slug));
        this.upsertArticle(article);
        this.apiReady = true;
        return article;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "文章详情加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadAdminContent(query: contentApi.ArticleQuery = {}) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const [articlePage, categories, tags] = await Promise.all([
          contentApi.getAdminArticles({
            page: 1,
            pageSize: 50,
            sortBy: "updatedAt",
            order: "DESC",
            ...query,
          }),
          contentApi
            .getAdminCategories()
            .catch(() => contentApi.getPublicCategories()),
          contentApi.getAdminTags().catch(() => contentApi.getPublicTags()),
        ]);

        this.articles = articlePage.items.map(mapArticle);
        this.adminMeta = articlePage.meta;
        this.categories = categories.map(mapCategory);
        this.tags = tags.map(mapTag);
        this.apiReady = true;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "内容管理接口加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async loadAdminArticleDetail(id: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const article = mapArticle(await contentApi.getAdminArticle(id));
        this.upsertArticle(article);
        this.apiReady = true;
        return article;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "文章详情加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async loadAdminCategoryDetail(id: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const category = mapCategory(await contentApi.getAdminCategory(id));
        const index = this.categories.findIndex(
          (item) => item.id === category.id,
        );
        if (index === -1) {
          this.categories.push(category);
        } else {
          this.categories.splice(index, 1, category);
        }
        this.apiReady = true;
        return category;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "分类详情加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async loadAdminTagDetail(id: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const tag = mapTag(await contentApi.getAdminTag(id));
        const index = this.tags.findIndex((item) => item.id === tag.id);
        if (index === -1) {
          this.tags.push(tag);
        } else {
          this.tags.splice(index, 1, tag);
        }
        this.apiReady = true;
        return tag;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "标签详情加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async createArticle(payload: ArticleMutationPayload) {
      const article = mapArticle(
        await contentApi.createArticle(
          buildArticleRequest(payload, this.articles),
        ),
      );
      this.upsertArticle(article);
      await this.loadAdminContent();
      return article;
    },
    async updateArticle(payload: ArticleMutationPayload) {
      if (!payload.id) {
        return this.createArticle(payload);
      }

      const article = mapArticle(
        await contentApi.updateArticle(
          payload.id,
          buildArticleRequest(payload, this.articles),
        ),
      );
      this.upsertArticle(article);
      await this.loadAdminContent();
      return article;
    },
    async archiveArticle(id: string) {
      await contentApi.archiveArticle(id);
      await this.loadAdminContent();
    },
    async restoreArticleDraft(id: string) {
      const article = mapArticle(
        await contentApi.updateArticle(id, { status: "draft" }),
      );
      this.upsertArticle(article);
      await this.loadAdminContent();
      return article;
    },
    async deleteArticlePermanently(id: string) {
      await contentApi.deleteArticlePermanently(id);
      this.articles = this.articles.filter((article) => article.id !== id);
      await this.loadAdminContent();
    },
    async saveCategory(payload: CategoryMutationPayload) {
      const requestPayload = buildCategoryRequest(payload, this.categories);
      const category = mapCategory(
        payload.id
          ? await contentApi.updateCategory(payload.id, requestPayload)
          : await contentApi.createCategory(requestPayload),
      );

      const index = this.categories.findIndex(
        (item) => item.id === category.id,
      );
      if (index === -1) {
        this.categories.push(category);
      } else {
        this.categories.splice(index, 1, category);
      }

      await this.loadAdminContent();
      return category;
    },
    async deleteCategory(id: string) {
      await contentApi.deleteCategory(id);
      this.categories = this.categories.filter(
        (category) => category.id !== id,
      );
      await this.loadAdminContent();
      return true;
    },
    async saveTag(payload: TagMutationPayload) {
      const requestPayload = buildTagRequest(payload, this.tags);
      const tag = mapTag(
        payload.id
          ? await contentApi.updateTag(payload.id, requestPayload)
          : await contentApi.createTag(requestPayload),
      );

      const index = this.tags.findIndex((item) => item.id === tag.id);
      if (index === -1) {
        this.tags.push(tag);
      } else {
        this.tags.splice(index, 1, tag);
      }

      await this.loadAdminContent();
      return tag;
    },
    async deleteTag(id: string) {
      await contentApi.deleteTag(id);
      this.tags = this.tags.filter((tag) => tag.id !== id);
      await this.loadAdminContent();
    },
  },
});
