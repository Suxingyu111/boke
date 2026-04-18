import { put, remove, request } from "@/api/http";
import type { UserNotification } from "@/types/blog";

export interface NotificationsResponse {
  items: UserNotification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

export async function getNotifications(page = 1, pageSize = 20, unreadOnly = false) {
  const response = await request<NotificationsResponse>("/notifications", {
    page,
    pageSize,
    unreadOnly,
  });
  return response.data;
}

export async function getUnreadCount() {
  const response = await request<{ count: number }>("/notifications/unread-count");
  return response.data.count;
}

export async function markAsRead(id: string) {
  const response = await put<{ message: string }, undefined>(
    `/notifications/${id}/read`,
    undefined,
  );
  return response.data;
}

export async function markAllAsRead() {
  const response = await put<{ message: string }, undefined>(
    "/notifications/read-all",
    undefined,
  );
  return response.data;
}

export async function deleteNotification(id: string) {
  const response = await remove<{ message: string }>(`/notifications/${id}`);
  return response.data;
}
