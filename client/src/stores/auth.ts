import { defineStore } from "pinia";
import * as authApi from "@/api/auth";
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/types/blog";

const persistentTokenKey = "blog_token";
const sessionTokenKey = "blog_session_token";
const userStorageKey = "blog_user";

function readStoredUser(): AuthUser | null {
  const value =
    localStorage.getItem(userStorageKey) ??
    sessionStorage.getItem(userStorageKey);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

function readStoredToken() {
  return (
    localStorage.getItem(persistentTokenKey) ??
    sessionStorage.getItem(sessionTokenKey) ??
    ""
  );
}

function persistAuth(response: AuthResponse, remember: boolean) {
  const targetStorage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  targetStorage.setItem(
    remember ? persistentTokenKey : sessionTokenKey,
    response.accessToken,
  );
  targetStorage.setItem(userStorageKey, JSON.stringify(response.user));
  otherStorage.removeItem(remember ? sessionTokenKey : persistentTokenKey);
  otherStorage.removeItem(userStorageKey);
}

function clearStoredAuth() {
  localStorage.removeItem(persistentTokenKey);
  localStorage.removeItem(userStorageKey);
  sessionStorage.removeItem(sessionTokenKey);
  sessionStorage.removeItem(userStorageKey);
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: readStoredToken(),
    user: readStoredUser(),
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    canAccessAdmin: (state) =>
      state.user?.role === "admin" || state.user?.role === "super_admin",
    displayName: (state) => state.user?.nickname ?? state.user?.username ?? "",
  },
  actions: {
    applyAuth(response: AuthResponse, remember = true) {
      this.token = response.accessToken;
      this.user = response.user;
      persistAuth(response, remember);
    },
    async login(payload: LoginPayload, remember = true) {
      this.loading = true;
      try {
        const response = await authApi.login(payload);
        this.applyAuth(response, remember);
        return response;
      } finally {
        this.loading = false;
      }
    },
    async register(payload: RegisterPayload, remember = true) {
      this.loading = true;
      try {
        const response = await authApi.register(payload);
        this.applyAuth(response, remember);
        return response;
      } finally {
        this.loading = false;
      }
    },
    async refreshCurrentUser() {
      if (!this.token) {
        return null;
      }

      const user = await authApi.getCurrentUser();
      this.persistUser(user);
      return user;
    },
    async refreshCurrentAdminUser() {
      if (!this.token) {
        return null;
      }

      const user = await authApi.getCurrentAdminUser();
      this.persistUser(user);
      return user;
    },
    persistUser(user: AuthUser) {
      this.user = user;
      const storage = localStorage.getItem(persistentTokenKey)
        ? localStorage
        : sessionStorage;
      storage.setItem(userStorageKey, JSON.stringify(user));
    },
    logout() {
      this.token = "";
      this.user = null;
      clearStoredAuth();
    },
  },
});
