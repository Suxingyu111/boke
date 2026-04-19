import { http, post, put, remove } from "@/api/http";
import type {
  AdminComment,
  CommentPage,
  CommentPayload,
  CommentReplyPayload,
  CommentStatus,
  PublicComment,
  ApiResponse,
} from "@/types/blog";

export interface CommentQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminCommentQuery extends CommentQuery {
  status?: CommentStatus;
  articleId?: string;
}

export async function getArticleComments(
  articleId: string,
  query: CommentQuery = {},
) {
  const response = await http.get<
    unknown,
    ApiResponse<CommentPage<PublicComment>>
  >(`/articles/${articleId}/comments`, {
    params: query,
  });
  return response.data;
}

export async function createArticleComment(
  articleId: string,
  payload: CommentPayload,
) {
  const response = await post<
    {
      id: string;
      articleId: string;
      parentId: string | null;
      status: CommentStatus;
      createdAt: string;
      message: string;
    },
    CommentPayload
  >(`/articles/${articleId}/comments`, payload);
  return response.data;
}

export async function getAdminComments(query: AdminCommentQuery = {}) {
  const response = await http.get<
    unknown,
    ApiResponse<CommentPage<AdminComment>>
  >("/admin/comments", {
    params: query,
  });
  return response.data;
}

export async function updateCommentStatus(id: string, status: CommentStatus) {
  const response = await put<{ message: string }, { status: CommentStatus }>(
    `/admin/comments/${id}/status`,
    { status },
  );
  return response.data;
}

export async function replyComment(id: string, payload: CommentReplyPayload) {
  const response = await post<AdminComment, CommentReplyPayload>(
    `/admin/comments/${id}/reply`,
    payload,
  );
  return response.data;
}

export async function deleteComment(id: string) {
  const response = await remove<{ message: string }>(`/admin/comments/${id}`);
  return response.data;
}
