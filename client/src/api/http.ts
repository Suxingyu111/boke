import axios from "axios";
import type { ApiResponse } from "@/types/blog";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

http.interceptors.response.use((response) => response.data);

export async function request<T>(url: string): Promise<ApiResponse<T>> {
  return http.get<unknown, ApiResponse<T>>(url);
}
