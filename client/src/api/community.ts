import { post, request } from "@/api/http";
import type {
  Announcement,
  GuestbookMessage,
} from "@/types/blog";

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const response = await request<{ items?: unknown[] } | unknown[]>(
    "/announcements",
  );
  const items = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data.items)
      ? response.data.items
      : [];

  return items.map((item) => {
    const source = asRecord(item);

    return {
      id: String(source?.id ?? ""),
      title: String(source?.title ?? "站点公告"),
      content: String(source?.content ?? ""),
      level: source?.isPinned ? "success" : "info",
      publishedAt: String(
        source?.publishedAt ?? source?.createdAt ?? new Date().toISOString(),
      ),
      isActive: true,
      status: "published",
      isPinned: Boolean(source?.isPinned),
      createdAt:
        typeof source?.createdAt === "string" ? source.createdAt : undefined,
    };
  });
}

export async function getGuestbookMessages(): Promise<GuestbookMessage[]> {
  const response = await request<{ items?: unknown[] } | unknown[]>("/guestbook");
  const items = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data.items)
      ? response.data.items
      : [];

  return items.map((item) => {
    const source = asRecord(item);
    return {
      id: String(source?.id ?? ""),
      nickname: String(source?.nickname ?? "匿名访客"),
      email: typeof source?.email === "string" ? source.email : "",
      content: String(source?.content ?? ""),
      createdAt: String(source?.createdAt ?? new Date().toISOString()),
      status: "published",
    };
  });
}

export async function createGuestbookMessage(
  payload: Pick<GuestbookMessage, "nickname" | "email" | "content">,
): Promise<GuestbookMessage> {
  const response = await post<
    Partial<GuestbookMessage> & { message?: string },
    typeof payload
  >("/guestbook", payload);

  return {
    id: String(response.data.id ?? ""),
    nickname: String(response.data.nickname ?? payload.nickname),
    email: payload.email,
    content: String(response.data.content ?? payload.content),
    createdAt: String(response.data.createdAt ?? new Date().toISOString()),
    status: "pending",
  };
}
