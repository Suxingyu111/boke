import { post, request } from "@/api/http";
import type {
  Announcement,
  AnnouncementPageData,
  AnnouncementRecord,
  GuestbookCreateResult,
  GuestbookEntryRecord,
  GuestbookMessage,
  GuestbookPageData,
} from "@/types/blog";

function toAnnouncement(source: AnnouncementRecord): Announcement {
  return {
    id: source.id,
    title: source.title,
    content: source.content,
    level: source.isPinned ? "success" : "info",
    publishedAt: source.publishedAt ?? source.createdAt,
    isActive: source.status === "published",
    status: source.status === "published" ? "published" : "draft",
    isPinned: source.isPinned,
    createdAt: source.createdAt,
  };
}

function toGuestbookMessage(source: GuestbookEntryRecord): GuestbookMessage {
  return {
    id: source.id,
    nickname: source.nickname,
    email: source.email ?? "",
    content: source.content,
    createdAt: source.createdAt,
    status: source.status === "approved" ? "published" : "pending",
  };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const response = await request<AnnouncementPageData>("/announcements");
  return response.data.items.map(toAnnouncement);
}

export async function getGuestbookMessages(): Promise<GuestbookMessage[]> {
  const response = await request<GuestbookPageData>("/guestbook");
  return response.data.items.map(toGuestbookMessage);
}

export async function createGuestbookMessage(
  payload: Pick<GuestbookMessage, "nickname" | "email" | "content">,
): Promise<GuestbookMessage> {
  const response = await post<GuestbookCreateResult, typeof payload>(
    "/guestbook",
    payload,
  );

  return {
    id: response.data.id,
    nickname: response.data.nickname,
    email: payload.email,
    content: response.data.content,
    createdAt: response.data.createdAt,
    status: "pending",
  };
}
