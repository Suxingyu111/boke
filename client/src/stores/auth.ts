import { defineStore } from "pinia";
import * as authApi from "@/api/auth";
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/types/blog";
import {
  canAccessAdminFeatures,
  canAccessManagement,
} from "@/utils/permissions";

const persistentTokenKey = "blog_token";
const sessionTokenKey = "blog_session_token";
const userStorageKey = "blog_user";
const persistentSessionKey = "blog_auth_session";
const sessionSessionKey = "blog_session_auth";

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

function readStoredSession() {
  return Boolean(
    localStorage.getItem(persistentSessionKey) ??
      sessionStorage.getItem(sessionSessionKey),
  );
}

function persistAuth(response: AuthResponse, remember: boolean) {
  const targetStorage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  targetStorage.setItem(
    remember ? persistentTokenKey : sessionTokenKey,
    response.accessToken,
  );
  targetStorage.setItem(
    remember ? persistentSessionKey : sessionSessionKey,
    "1",
  );
  targetStorage.setItem(userStorageKey, JSON.stringify(response.user));
  otherStorage.removeItem(remember ? sessionTokenKey : persistentTokenKey);
  otherStorage.removeItem(remember ? sessionSessionKey : persistentSessionKey);
  otherStorage.removeItem(userStorageKey);
}

function persistSession(remember: boolean) {
  const targetStorage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  targetStorage.setItem(
    remember ? persistentSessionKey : sessionSessionKey,
    "1",
  );
  otherStorage.removeItem(userStorageKey);
  otherStorage.removeItem(remember ? sessionTokenKey : persistentTokenKey);
  otherStorage.removeItem(remember ? sessionSessionKey : persistentSessionKey);
}

function clearStoredAuth() {
  localStorage.removeItem(persistentTokenKey);
  localStorage.removeItem(persistentSessionKey);
  localStorage.removeItem(userStorageKey);
  sessionStorage.removeItem(sessionTokenKey);
  sessionStorage.removeItem(sessionSessionKey);
  sessionStorage.removeItem(userStorageKey);
}

function resolveUserStorage() {
  if (
    localStorage.getItem(persistentTokenKey) ||
    localStorage.getItem(persistentSessionKey)
  ) {
    return localStorage;
  }

  if (
    sessionStorage.getItem(sessionTokenKey) ||
    sessionStorage.getItem(sessionSessionKey)
  ) {
    return sessionStorage;
  }

  return localStorage;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: readStoredToken(),
    sessionActive: readStoredSession(),
    user: readStoredUser(),
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token || state.sessionActive),
    canAccessManagement: (state) => canAccessManagement(state.user),
    canAccessAdmin: (state) => canAccessAdminFeatures(state.user),
    displayName: (state) => state.user?.nickname ?? state.user?.username ?? "",
  },
  actions: {
    applyAuth(response: AuthResponse, remember = true) {
      this.token = response.accessToken;
      this.sessionActive = true;
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
    async completeOAuthLogin(remember = true) {
      this.loading = true;
      try {
        this.token = "";
        this.sessionActive = true;
        persistSession(remember);
        const user = await authApi.getCurrentUser();
        this.user = user;
        this.persistUser(user);
        return user;
      } catch (error) {
        await this.logout();
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async refreshCurrentUser() {
      if (!this.isAuthenticated) {
        return null;
      }

      const user = await authApi.getCurrentUser();
      this.sessionActive = true;
      this.persistUser(user);
      return user;
    },
    async refreshCurrentAdminUser() {
      if (!this.isAuthenticated) {
        return null;
      }

      const user = await authApi.getCurrentAdminUser();
      this.sessionActive = true;
      this.persistUser(user);
      return user;
    },
    persistUser(user: AuthUser) {
      this.user = user;
      const storage = resolveUserStorage();
      storage.setItem(userStorageKey, JSON.stringify(user));
    },
    async logout() {
      try {
        await authApi.logout();
      } finally {
        this.token = "";
        this.sessionActive = false;
        this.user = null;
        clearStoredAuth();
      }
    },
  },
});
