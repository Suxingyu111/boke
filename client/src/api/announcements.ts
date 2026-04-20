import { post, put, remove, request } from "@/api/http";
import type { AnnouncementPageData, AnnouncementRecord } from "@/types/blog";

export interface AnnouncementPayload {
  title: string;
  content: string;
  status: "draft" | "published";
  isPinned: boolean;
}

export async function getAdminAnnouncements() {
  const response = await request<AnnouncementPageData>("/admin/announcements");
  return response.data;
}

export async function createAnnouncement(payload: AnnouncementPayload) {
  const response = await post<AnnouncementRecord, AnnouncementPayload>(
    "/admin/announcements",
    payload,
  );
  return response.data;
}

export async function updateAnnouncement(
  id: string,
  payload: Partial<AnnouncementPayload>,
) {
  const response = await put<AnnouncementRecord, Partial<AnnouncementPayload>>(
    `/admin/announcements/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteAnnouncement(id: string) {
  const response = await remove<{ message: string }>(`/admin/announcements/${id}`);
  return response.data;
}
