import { patch, post, put, remove, request } from "@/api/http";

export interface ArchiveMonth {
  year: number;
  month: number;
  count: number;
}

export interface ArchiveArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  publishedAt: string;
}

export interface ArchiveGroup {
  year: number;
  month: number;
  articles: ArchiveArticle[];
}

export interface SearchQuery {
  keyword?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  contentHighlight?: string | null;
  publishedAt?: string | null;
  score?: number | null;
}

export interface SearchResultPage {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RebuildIndexResult {
  indexed: number;
  failed: number;
}

export interface CollaboratorPayload {
  userId: string;
  permission: "editor" | "viewer";
}

export interface DraftUpdatePayload {
  title?: string;
  content?: string;
  contentHtml?: string;
  excerpt?: string;
}

export interface DraftCollaborator {
  id: string;
  userId: string;
  username?: string;
  nickname?: string | null;
  avatar?: string | null;
  permission: "editor" | "viewer";
  invitedBy: string;
  inviterName?: string;
  createdAt: string;
}

export interface DraftEditLog {
  id: string;
  userId: string;
  username?: string;
  fieldChanged: string;
  summary: string;
  createdAt: string;
}

export interface PaidContentPayload {
  price: number;
  previewPercent?: number;
  isActive?: boolean;
  description?: string;
}

export interface PaidContentInfo {
  price: number;
  previewPercent: number;
  description?: string | null;
}

export interface PaidArticleContent {
  content: string;
  contentHtml?: string | null;
  isPaid: boolean;
  hasAccess: boolean;
  price?: number;
  previewPercent?: number;
}

export interface PurchasePayload {
  articleId: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface PurchaseRecord {
  id: string;
  articleId?: string;
  articleTitle?: string;
  articleSlug?: string;
  userId?: string;
  username?: string;
  paidAmount: number;
  paymentMethod?: string;
  purchasedAt: string;
}

export interface SubscriptionPayload {
  email: string;
  name?: string;
}

export interface SubscriptionResult {
  message: string;
  confirmToken?: string;
}

export interface NotificationPayload {
  toEmail: string;
  subject: string;
  body: string;
  type?: "comment" | "subscription" | "system";
}

export interface NotifySubscribersPayload {
  articleTitle: string;
  articleSlug: string;
}

export interface NotifySubscribersResult {
  sent: number;
  failed: number;
}

export interface RetryFailedResult {
  retried: number;
}

export interface EmailNotification {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  type: "comment" | "subscription" | "system";
  status: "pending" | "sent" | "failed";
  retryCount: number;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  name?: string | null;
  isConfirmed: boolean;
  isActive: boolean;
  subscribedAt: string;
  confirmedAt?: string | null;
}

export async function getArchiveSummary() {
  const response = await request<ArchiveMonth[]>("/archives");
  return response.data;
}

export async function getArchiveArticles(year: number, month: number) {
  const response = await request<ArchiveGroup>("/archives/articles", {
    year,
    month,
  });
  return response.data;
}

export async function searchArticles(query: SearchQuery = {}) {
  const response = await request<SearchResultPage>("/search", query);
  return response.data;
}

export async function rebuildSearchIndex() {
  const response = await post<RebuildIndexResult, undefined>(
    "/admin/search/rebuild-index",
    undefined,
  );
  return response.data;
}

export async function addCollaborator(
  articleId: string,
  payload: CollaboratorPayload,
) {
  const response = await post<DraftCollaborator, CollaboratorPayload>(
    `/admin/collaboration/${articleId}/collaborators`,
    payload,
  );
  return response.data;
}

export async function removeCollaborator(
  articleId: string,
  collaboratorId: string,
) {
  const response = await remove<{ message?: string }>(
    `/admin/collaboration/${articleId}/collaborators/${collaboratorId}`,
  );
  return response.data;
}

export async function getCollaborators(articleId: string) {
  const response = await request<DraftCollaborator[]>(
    `/admin/collaboration/${articleId}/collaborators`,
  );
  return response.data;
}

export async function updateDraft(
  articleId: string,
  payload: DraftUpdatePayload,
) {
  const response = await patch<unknown, DraftUpdatePayload>(
    `/admin/collaboration/${articleId}/draft`,
    payload,
  );
  return response.data;
}

export async function getEditHistory(articleId: string) {
  const response = await request<DraftEditLog[]>(
    `/admin/collaboration/${articleId}/history`,
  );
  return response.data;
}

export async function setPaidContent(
  articleId: string,
  payload: PaidContentPayload,
) {
  const response = await put<unknown, PaidContentPayload>(
    `/admin/paid-content/${articleId}`,
    payload,
  );
  return response.data;
}

export async function removePaidContent(articleId: string) {
  const response = await remove<{ message?: string }>(
    `/admin/paid-content/${articleId}`,
  );
  return response.data;
}

export async function getPurchaseRecords(articleId: string) {
  const response = await request<PurchaseRecord[]>(
    `/admin/paid-content/${articleId}/purchases`,
  );
  return response.data;
}

export async function getPaidInfo(articleId: string) {
  const response = await request<PaidContentInfo | null>(
    `/paid-content/${articleId}/info`,
  );
  return response.data;
}

export async function getPaidArticleContent(articleId: string) {
  const response = await request<PaidArticleContent>(
    `/paid-content/${articleId}/content`,
  );
  return response.data;
}

export async function purchaseArticle(payload: PurchasePayload) {
  const response = await post<PurchaseRecord, PurchasePayload>(
    "/paid-content/purchase",
    payload,
  );
  return response.data;
}

export async function checkPurchase(articleId: string) {
  const response = await request<boolean | { purchased?: boolean }>(
    `/paid-content/${articleId}/check`,
  );
  return response.data;
}

export async function getMyPurchases() {
  const response = await request<PurchaseRecord[]>(
    "/paid-content/my-purchases",
  );
  return response.data;
}

export async function subscribe(payload: SubscriptionPayload) {
  const response = await post<SubscriptionResult, SubscriptionPayload>(
    "/subscriptions",
    payload,
  );
  return response.data;
}

export async function confirmSubscription(token: string) {
  const response = await request<{ message?: string }>(
    `/subscriptions/confirm/${token}`,
  );
  return response.data;
}

export async function unsubscribe(token: string) {
  const response = await request<{ message?: string }>(
    `/subscriptions/unsubscribe/${token}`,
  );
  return response.data;
}

export async function sendNotification(payload: NotificationPayload) {
  const response = await post<EmailNotification, NotificationPayload>(
    "/admin/notifications/send",
    payload,
  );
  return response.data;
}

export async function notifySubscribers(payload: NotifySubscribersPayload) {
  const response = await post<
    NotifySubscribersResult,
    NotifySubscribersPayload
  >("/admin/notifications/notify-subscribers", payload);
  return response.data;
}

export async function retryFailedNotifications() {
  const response = await post<RetryFailedResult, undefined>(
    "/admin/notifications/retry-failed",
    undefined,
  );
  return response.data;
}

export async function getNotifications(page = 1, pageSize = 20) {
  const response = await request<AdminPage<EmailNotification>>(
    "/admin/notifications",
    { page, pageSize },
  );
  return response.data;
}

export async function getSubscribers(page = 1, pageSize = 20) {
  const response = await request<AdminPage<EmailSubscriber>>(
    "/admin/notifications/subscribers",
    { page, pageSize },
  );
  return response.data;
}

export async function removeSubscriber(id: string) {
  const response = await remove<{ message?: string }>(
    `/admin/notifications/subscribers/${id}`,
  );
  return response.data;
}
