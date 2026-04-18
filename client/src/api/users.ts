import { put, request } from "@/api/http";
import type { FavoriteArticle, UserProfile } from "@/types/blog";

export interface FavoriteArticlesResponse {
  items: FavoriteArticle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateProfilePayload {
  nickname?: string;
  avatar?: string;
  bio?: string;
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
