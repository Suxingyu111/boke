import axios from "axios";
import type { ApiResponse } from "@/types/blog";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const pageCacheTtl = Number(import.meta.env.VITE_PAGE_CACHE_TTL || 60000);
const pageCacheMaxEntries = Number(import.meta.env.VITE_PAGE_CACHE_MAX_ENTRIES || 80);
const csrfStorageKey = "blog_csrf_token";
const getCache = new Map<string, { expiresAt: number; value: ApiResponse<unknown> }>();
const devProxyRetryDelaysMs = import.meta.env.DEV
  ? [1000, 2000, 4000, 8000, 12000, 15000]
  : [];

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function shouldRetryGetRequest(error: unknown, attempt: number) {
  if (attempt >= devProxyRetryDelaysMs.length || !axios.isAxiosError(error)) {
    return false;
  }

  const method = (error.config?.method ?? "get").toLowerCase();
  if (method !== "get") {
    return false;
  }

  const status = error.response?.status;
  if (status && [502, 503, 504].includes(status)) {
    return true;
  }

  return ["ECONNREFUSED", "ECONNRESET", "ERR_NETWORK"].includes(error.code ?? "");
}

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
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  config.withCredentials = true;
  config.headers.Accept = "application/json";
  config.headers["X-Requested-With"] = "XMLHttpRequest";

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
      localStorage.removeItem("blog_auth_session");
      sessionStorage.removeItem("blog_session_token");
      sessionStorage.removeItem("blog_user");
      sessionStorage.removeItem("blog_session_auth");
      sessionStorage.removeItem(csrfStorageKey);
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

  let response: ApiResponse<T> | null = null;

  for (let attempt = 0; attempt <= devProxyRetryDelaysMs.length; attempt += 1) {
    try {
      response = await http.get<unknown, ApiResponse<T>>(url, { params });
      break;
    } catch (error) {
      if (!shouldRetryGetRequest(error, attempt)) {
        throw error;
      }

      await wait(devProxyRetryDelaysMs[attempt]);
    }
  }

  if (!response) {
    throw new Error(`GET ${url} failed without a response`);
  }

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
