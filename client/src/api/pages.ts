import { patch, post, remove, request } from "@/api/http";
import type { FriendLinkStatus, PageStatus, PageType } from "@/types/blog";

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

export interface FriendLinkPayload {
  siteName: string;
  siteUrl: string;
  logoUrl?: string;
  description?: string;
  contactEmail?: string;
  applicantName?: string;
  sortOrder?: number;
  status?: FriendLinkStatus;
}

export interface FriendLinkApplicationPayload {
  siteName: string;
  siteUrl: string;
  description?: string;
  contactEmail?: string;
  applicantName?: string;
}

export async function getPublicAboutPage() {
  const response = await request<unknown>("/pages/about");
  return response.data;
}

export async function getPublicPage(slug: string) {
  const response = await request<unknown>(`/pages/${slug}`);
  return response.data;
}

export async function getPublicFriendLinks() {
  const response = await request<unknown[]>("/friend-links");
  return response.data;
}

export async function applyFriendLink(payload: FriendLinkApplicationPayload) {
  const response = await post<unknown, FriendLinkApplicationPayload>(
    "/friend-links/applications",
    payload,
  );
  return response.data;
}

export async function getAdminPages() {
  const response = await request<unknown[]>("/admin/pages");
  return response.data;
}

export async function getAdminPage(id: string) {
  const response = await request<unknown>(`/admin/pages/${id}`);
  return response.data;
}

export async function createPage(payload: PagePayload) {
  const response = await post<unknown, PagePayload>("/admin/pages", payload);
  return response.data;
}

export async function updatePage(id: string, payload: Partial<PagePayload>) {
  const response = await patch<unknown, Partial<PagePayload>>(
    `/admin/pages/${id}`,
    payload,
  );
  return response.data;
}

export async function deletePage(id: string) {
  const response = await remove<{ message: string }>(`/admin/pages/${id}`);
  return response.data;
}

export async function getAdminFriendLinks() {
  const response = await request<unknown[]>("/admin/friend-links");
  return response.data;
}

export async function getAdminFriendLink(id: string) {
  const response = await request<unknown>(`/admin/friend-links/${id}`);
  return response.data;
}

export async function createFriendLink(payload: FriendLinkPayload) {
  const response = await post<unknown, FriendLinkPayload>(
    "/admin/friend-links",
    payload,
  );
  return response.data;
}

export async function updateFriendLink(
  id: string,
  payload: Partial<FriendLinkPayload>,
) {
  const response = await patch<unknown, Partial<FriendLinkPayload>>(
    `/admin/friend-links/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteFriendLink(id: string) {
  const response = await remove<{ message: string }>(
    `/admin/friend-links/${id}`,
  );
  return response.data;
}
