import axios from "axios";
import type { ApiResponse } from "@/types/blog";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const tokenStorageKeys = ["blog_token", "blog_session_token"];

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = tokenStorageKeys
    .map((key) => localStorage.getItem(key) ?? sessionStorage.getItem(key))
    .find(Boolean);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("blog_token");
      localStorage.removeItem("blog_user");
      sessionStorage.removeItem("blog_session_token");
      sessionStorage.removeItem("blog_user");
    }

    return Promise.reject(error);
  },
);

export async function request<T>(
  url: string,
  params?: object,
): Promise<ApiResponse<T>> {
  return http.get<unknown, ApiResponse<T>>(url, { params });
}

export async function post<T, D = unknown>(
  url: string,
  data: D,
): Promise<ApiResponse<T>> {
  return http.post<unknown, ApiResponse<T>>(url, data);
}

export async function patch<T, D = unknown>(
  url: string,
  data: D,
): Promise<ApiResponse<T>> {
  return http.patch<unknown, ApiResponse<T>>(url, data);
}

export async function remove<T>(url: string): Promise<ApiResponse<T>> {
  return http.delete<unknown, ApiResponse<T>>(url);
}
