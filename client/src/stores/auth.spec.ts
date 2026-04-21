import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthResponse, AuthUser } from "@/types/blog";
import { useAuthStore } from "@/stores/auth";

const authApiMocks = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  logoutMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getCurrentAdminUserMock: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  login: authApiMocks.loginMock,
  register: authApiMocks.registerMock,
  logout: authApiMocks.logoutMock,
  getCurrentUser: authApiMocks.getCurrentUserMock,
  getCurrentAdminUser: authApiMocks.getCurrentAdminUserMock,
}));

const mockUser: AuthUser = {
  id: "user-1",
  username: "writer",
  email: "writer@example.com",
  phone: null,
  nickname: "码字人",
  avatar: null,
  bio: null,
  registrationType: "email",
  emailVerified: true,
  phoneVerified: false,
  isActive: true,
  role: "admin",
  lastLoginAt: null,
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
};

const mockResponse: AuthResponse = {
  accessToken: "token-123",
  tokenType: "Bearer",
  expiresIn: "7d",
  user: mockUser,
};

describe("useAuthStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    authApiMocks.logoutMock.mockResolvedValue({ message: "已退出登录" });
  });

  it("persists remembered login in localStorage", async () => {
    authApiMocks.loginMock.mockResolvedValue(mockResponse);
    const store = useAuthStore();

    await store.login({ account: "writer", password: "secret" }, true);

    expect(store.token).toBe("token-123");
    expect(store.user?.username).toBe("writer");
    expect(localStorage.getItem("blog_token")).toBe("token-123");
    expect(localStorage.getItem("blog_user")).toContain("writer");
    expect(sessionStorage.getItem("blog_session_token")).toBeNull();
  });

  it("completes OAuth login with session storage when remember is false", async () => {
    authApiMocks.getCurrentUserMock.mockResolvedValue(mockUser);
    const store = useAuthStore();

    await store.completeOAuthLogin(false);

    expect(store.user?.email).toBe("writer@example.com");
    expect(store.token).toBe("");
    expect(store.sessionActive).toBe(true);
    expect(sessionStorage.getItem("blog_session_token")).toBeNull();
    expect(sessionStorage.getItem("blog_session_auth")).toBe("1");
    expect(localStorage.getItem("blog_token")).toBeNull();
  });

  it("logout clears cookie-session markers and user state", async () => {
    const store = useAuthStore();
    store.sessionActive = true;
    store.user = mockUser;
    sessionStorage.setItem("blog_session_auth", "1");
    sessionStorage.setItem("blog_user", JSON.stringify(mockUser));

    await store.logout();

    expect(authApiMocks.logoutMock).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(sessionStorage.getItem("blog_session_auth")).toBeNull();
  });

  it("exposes management access by role", () => {
    const store = useAuthStore();

    store.applyAuth({
      ...mockResponse,
      user: {
        ...mockUser,
        role: "author",
      },
    });

    expect(store.canAccessManagement).toBe(true);
    expect(store.canAccessAdmin).toBe(false);
  });
});
