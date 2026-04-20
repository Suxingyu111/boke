import { patch, post, remove, request } from "@/api/http";
import type { Article, ArticleStatus, Category, Tag } from "@/types/blog";

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ArticleQuery {
  page?: number;
  pageSize?: number;
  status?: ArticleStatus;
  categoryId?: string;
  tagId?: string;
  keyword?: string;
  sortBy?: "createdAt" | "updatedAt" | "publishedAt" | "viewCount";
  order?: "ASC" | "DESC";
}

export interface ArticlePayload {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  contentHtml?: string;
  coverImage?: string;
  categoryId: string;
  tagIds?: string[];
  status?: ArticleStatus;
  visibility?: "public" | "private" | "password";
  allowComment?: boolean;
  isTop?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  scheduledAt?: string;
}

export interface ArticleLikeState {
  liked: boolean;
  likes: number;
}

export interface ArticleLikeAction extends ArticleLikeState {
  message: string;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isVisible?: boolean;
  color?: string;
}

export interface TagPayload {
  name: string;
  slug: string;
}

export async function getPublicArticles(query: ArticleQuery = {}) {
  const response = await request<PaginatedResponse<Article>>(
    "/articles",
    query,
  );
  return response.data;
}

export async function getPublicArticle(slug: string) {
  const response = await request<Article>(`/articles/${slug}`);
  return response.data;
}

export async function getArticleLikeState(articleId: string) {
  const response = await request<ArticleLikeState>(`/articles/${articleId}/like`);
  return response.data;
}

export async function likeArticle(articleId: string) {
  const response = await post<ArticleLikeAction, undefined>(
    `/articles/${articleId}/like`,
    undefined,
  );
  return response.data;
}

export async function unlikeArticle(articleId: string) {
  const response = await remove<ArticleLikeAction>(`/articles/${articleId}/like`);
  return response.data;
}

export async function getAdminArticles(query: ArticleQuery = {}) {
  const response = await request<PaginatedResponse<Article>>(
    "/admin/articles",
    query,
  );
  return response.data;
}

export async function getAdminArticle(id: string) {
  const response = await request<Article>(`/admin/articles/${id}`);
  return response.data;
}

export async function createArticle(payload: ArticlePayload) {
  const response = await post<Article, ArticlePayload>(
    "/admin/articles",
    payload,
  );
  return response.data;
}

export async function updateArticle(
  id: string,
  payload: Partial<ArticlePayload>,
) {
  const response = await patch<Article, Partial<ArticlePayload>>(
    `/admin/articles/${id}`,
    payload,
  );
  return response.data;
}

export async function archiveArticle(id: string) {
  const response = await remove<{ message: string }>(`/admin/articles/${id}`);
  return response.data;
}

export async function deleteArticlePermanently(id: string) {
  const response = await remove<{ message: string }>(
    `/admin/articles/${id}/permanent`,
  );
  return response.data;
}

export async function getPublicCategories() {
  const response = await request<Category[]>("/categories");
  return response.data;
}

export async function getAdminCategories() {
  const response = await request<Category[]>("/admin/categories");
  return response.data;
}

export async function getAdminCategory(id: string) {
  const response = await request<Category>(`/admin/categories/${id}`);
  return response.data;
}

export async function createCategory(payload: CategoryPayload) {
  const response = await post<Category, CategoryPayload>(
    "/admin/categories",
    payload,
  );
  return response.data;
}

export async function updateCategory(
  id: string,
  payload: Partial<CategoryPayload>,
) {
  const response = await patch<Category, Partial<CategoryPayload>>(
    `/admin/categories/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteCategory(id: string) {
  const response = await remove<{ message: string }>(`/admin/categories/${id}`);
  return response.data;
}

export async function getPublicTags() {
  const response = await request<Tag[]>("/tags");
  return response.data;
}

export async function getAdminTags() {
  const response = await request<Tag[]>("/admin/tags");
  return response.data;
}

export async function getAdminTag(id: string) {
  const response = await request<Tag>(`/admin/tags/${id}`);
  return response.data;
}

export async function createTag(payload: TagPayload) {
  const response = await post<Tag, TagPayload>("/admin/tags", payload);
  return response.data;
}

export async function updateTag(id: string, payload: Partial<TagPayload>) {
  const response = await patch<Tag, Partial<TagPayload>>(
    `/admin/tags/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteTag(id: string) {
  const response = await remove<{ message: string }>(`/admin/tags/${id}`);
  return response.data;
}
