import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthResponse, AuthUser } from "@/types/blog";
import { useAuthStore } from "@/stores/auth";

const authApiMocks = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getCurrentAdminUserMock: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  login: authApiMocks.loginMock,
  register: authApiMocks.registerMock,
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

    await store.completeOAuthLogin("oauth-token", false);

    expect(store.user?.email).toBe("writer@example.com");
    expect(sessionStorage.getItem("blog_session_token")).toBe("oauth-token");
    expect(localStorage.getItem("blog_token")).toBeNull();
  });
});
