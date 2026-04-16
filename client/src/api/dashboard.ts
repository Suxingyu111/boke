import { request } from "@/api/http";
import type { ArticleStatus } from "@/types/blog";

export interface DashboardStatsResponse {
  articleCount: number;
  totalViewCount: number;
  totalCommentCount: number;
  categoryCount?: number;
  tagCount?: number;
  draftCount?: number;
  publishedCount?: number;
  pageCount?: number;
  friendLinkCount?: number;
}

export interface RecentArticleResponse {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  viewCount: number;
  commentCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export async function getDashboardStats() {
  const response = await request<DashboardStatsResponse>(
    "/admin/dashboard/stats",
  );
  return response.data;
}

export async function getRecentArticles(limit = 5) {
  const response = await request<RecentArticleResponse[]>(
    "/admin/dashboard/recent-articles",
    { limit },
  );
  return response.data;
}
