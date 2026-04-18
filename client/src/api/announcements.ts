import { post, put, remove, request } from "@/api/http";
import type { Announcement } from "@/types/blog";

export interface AnnouncementPayload {
  title: string;
  content: string;
  status: "draft" | "published";
  isPinned: boolean;
}

export interface AnnouncementPage {
  items: Announcement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAdminAnnouncements() {
  const response = await request<AnnouncementPage>("/admin/announcements");
  return response.data;
}

export async function createAnnouncement(payload: AnnouncementPayload) {
  const response = await post<Announcement, AnnouncementPayload>(
    "/admin/announcements",
    payload,
  );
  return response.data;
}

export async function updateAnnouncement(
  id: string,
  payload: Partial<AnnouncementPayload>,
) {
  const response = await put<Announcement, Partial<AnnouncementPayload>>(
    `/admin/announcements/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteAnnouncement(id: string) {
  const response = await remove<{ message: string }>(`/admin/announcements/${id}`);
  return response.data;
}
