import { http, put, request } from "@/api/http";
import type { ApiResponse, FavoriteArticle, UserProfile } from "@/types/blog";

export interface FavoriteArticlesResponse {
  items: FavoriteArticle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateProfilePayload {
  nickname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  email?: string | null;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export async function getProfile() {
  const response = await request<UserProfile>("/users/profile");
  return response.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await put<UserProfile, UpdateProfilePayload>(
    "/users/profile",
    payload,
  );
  return response.data;
}

/** 上传头像图片，自动更新用户 avatar，返回 { url } */
export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await http.post<
    ApiResponse<{ url: string }>,
    ApiResponse<{ url: string }>,
    FormData
  >(
    "/users/avatar",
    formData,
  );
  return response.data;
}

export async function changePassword(payload: ChangePasswordPayload) {
  const response = await put<{ message: string }, ChangePasswordPayload>(
    "/users/password",
    payload,
  );
  return response.data;
}

export async function getFavoriteArticles(page = 1, pageSize = 20) {
  const response = await request<FavoriteArticlesResponse>("/users/favorites", {
    page,
    pageSize,
  });
  return response.data;
}
