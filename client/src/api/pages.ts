import { patch, post, remove, request } from "@/api/http";
import type { CustomPage, PageStatus, PageType } from "@/types/blog";

export interface PagePayload {
  title: string;
  slug: string;
  pageType?: PageType;
  content: string;
  contentHtml?: string;
  summary?: string;
  isHomeVisible?: boolean;
  status?: PageStatus;
  seoTitle?: string;
  seoDescription?: string;
}

export async function getPublicAboutPage() {
  const response = await request<CustomPage>("/pages/about");
  return response.data;
}

export async function getPublicPage(slug: string) {
  const response = await request<CustomPage>(`/pages/${slug}`);
  return response.data;
}

export async function getAdminPages() {
  const response = await request<CustomPage[]>("/admin/pages");
  return response.data;
}

export async function getAdminPage(id: string) {
  const response = await request<CustomPage>(`/admin/pages/${id}`);
  return response.data;
}

export async function createPage(payload: PagePayload) {
  const response = await post<CustomPage, PagePayload>("/admin/pages", payload);
  return response.data;
}

export async function updatePage(id: string, payload: Partial<PagePayload>) {
  const response = await patch<CustomPage, Partial<PagePayload>>(
    `/admin/pages/${id}`,
    payload,
  );
  return response.data;
}

export async function deletePage(id: string) {
  const response = await remove<{ message: string }>(`/admin/pages/${id}`);
  return response.data;
}
