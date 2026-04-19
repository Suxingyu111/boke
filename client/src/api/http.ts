import axios from "axios";
import type { ApiResponse } from "@/types/blog";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const tokenStorageKeys = ["blog_token", "blog_session_token"];
const pageCacheTtl = Number(import.meta.env.VITE_PAGE_CACHE_TTL || 60000);
const pageCacheMaxEntries = Number(import.meta.env.VITE_PAGE_CACHE_MAX_ENTRIES || 80);
const csrfStorageKey = "blog_csrf_token";
const getCache = new Map<string, { expiresAt: number; value: ApiResponse<unknown> }>();

function getCsrfToken() {
  const existing = sessionStorage.getItem(csrfStorageKey);
  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  sessionStorage.setItem(csrfStorageKey, token);
  return token;
}

function getCacheKey(url: string, params?: object) {
  return `${url}?${JSON.stringify(params ?? {})}`;
}

function pruneExpiredGetCache(now = Date.now()) {
  getCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      getCache.delete(key);
    }
  });
}

function trimGetCacheSize() {
  while (getCache.size >= pageCacheMaxEntries) {
    const oldestKey = getCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    getCache.delete(oldestKey);
  }
}

export function invalidateGetCache(
  matcher?: string | RegExp | ((cacheKey: string) => boolean),
) {
  if (!matcher) {
    getCache.clear();
    return;
  }

  getCache.forEach((_entry, key) => {
    const matched =
      typeof matcher === "string"
        ? key.includes(matcher)
        : matcher instanceof RegExp
          ? matcher.test(key)
          : matcher(key);

    if (matched) {
      getCache.delete(key);
    }
  });
}

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = tokenStorageKeys
    .map((key) => localStorage.getItem(key) ?? sessionStorage.getItem(key))
    .find(Boolean);

  config.headers["X-Requested-With"] = "XMLHttpRequest";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!["get", "head", "options"].includes(config.method ?? "get")) {
    config.headers["X-CSRF-Token"] = getCsrfToken();
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
  pruneExpiredGetCache();
  const cacheKey = getCacheKey(url, params);
  const cached = getCache.get(cacheKey);

  if (cached) {
    return cached.value as ApiResponse<T>;
  }

  const response = await http.get<unknown, ApiResponse<T>>(url, { params });
  if (pageCacheTtl > 0) {
    trimGetCacheSize();
    getCache.set(cacheKey, {
      expiresAt: Date.now() + pageCacheTtl,
      value: response as ApiResponse<unknown>,
    });
  }
  return response;
}

export async function post<T, D = unknown>(
  url: string,
  data: D,
): Promise<ApiResponse<T>> {
  const response = await http.post<unknown, ApiResponse<T>>(url, data);
  invalidateGetCache();
  return response;
}

export async function patch<T, D = unknown>(
  url: string,
  data: D,
): Promise<ApiResponse<T>> {
  const response = await http.patch<unknown, ApiResponse<T>>(url, data);
  invalidateGetCache();
  return response;
}

export async function put<T, D = unknown>(
  url: string,
  data: D,
): Promise<ApiResponse<T>> {
  const response = await http.put<unknown, ApiResponse<T>>(url, data);
  invalidateGetCache();
  return response;
}

export async function remove<T>(url: string): Promise<ApiResponse<T>> {
  const response = await http.delete<unknown, ApiResponse<T>>(url);
  invalidateGetCache();
  return response;
}
