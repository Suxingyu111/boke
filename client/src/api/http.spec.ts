import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const axiosMocks = vi.hoisted(() => {
  const getMock = vi.fn();
  const postMock = vi.fn();
  const patchMock = vi.fn();
  const putMock = vi.fn();
  const deleteMock = vi.fn();
  const requestUseMock = vi.fn();
  const responseUseMock = vi.fn();
  const createMock = vi.fn(() => ({
    get: getMock,
    post: postMock,
    patch: patchMock,
    put: putMock,
    delete: deleteMock,
    interceptors: {
      request: { use: requestUseMock },
      response: { use: responseUseMock },
    },
  }));

  return {
    deleteMock,
    getMock,
    patchMock,
    postMock,
    putMock,
    requestUseMock,
    responseUseMock,
    createMock,
  };
});

vi.mock("axios", () => ({
  default: {
    create: axiosMocks.createMock,
    isAxiosError: (error: unknown) =>
      Boolean(
        error &&
          typeof error === "object" &&
          "isAxiosError" in error &&
          (error as { isAxiosError?: boolean }).isAxiosError,
      ),
  },
}));

function createAxiosError(status?: number, code?: string) {
  return {
    isAxiosError: true,
    code,
    config: {
      method: "get",
    },
    response: status ? { status } : undefined,
  };
}

describe("http request retries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries transient proxy failures for GET requests", async () => {
    axiosMocks.getMock
      .mockRejectedValueOnce(createAxiosError(502))
      .mockRejectedValueOnce(createAxiosError(undefined, "ERR_NETWORK"))
      .mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        data: { ok: true },
      });

    const { request } = await import("@/api/http");
    const promise = request<{ ok: boolean }>("/settings");

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({
      success: true,
      data: { ok: true },
    });
    expect(axiosMocks.getMock).toHaveBeenCalledTimes(3);
  });

  it("configures axios to always send credentials and hardened headers", async () => {
    await import("@/api/http");

    expect(axiosMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "/api",
        timeout: 10000,
        withCredentials: true,
      }),
    );

    const requestInterceptor = axiosMocks.requestUseMock.mock.calls[0]?.[0];
    expect(requestInterceptor).toBeTypeOf("function");

    const config = await requestInterceptor({
      headers: {},
      method: "post",
    });

    expect(config.withCredentials).toBe(true);
    expect(config.headers.Accept).toBe("application/json");
    expect(config.headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(config.headers["X-CSRF-Token"]).toBeTypeOf("string");
  });

  it("clears session markers and csrf token when the server returns 401", async () => {
    localStorage.setItem("blog_auth_session", "1");
    localStorage.setItem("blog_user", "{\"id\":\"user-1\"}");
    sessionStorage.setItem("blog_session_auth", "1");
    sessionStorage.setItem("blog_user", "{\"id\":\"user-1\"}");
    sessionStorage.setItem("blog_csrf_token", "csrf-token");

    await import("@/api/http");

    const responseRejectedInterceptor = axiosMocks.responseUseMock.mock.calls[0]?.[1];
    const error = {
      response: {
        status: 401,
      },
    };

    await expect(responseRejectedInterceptor(error)).rejects.toBe(error);

    expect(localStorage.getItem("blog_auth_session")).toBeNull();
    expect(localStorage.getItem("blog_user")).toBeNull();
    expect(sessionStorage.getItem("blog_session_auth")).toBeNull();
    expect(sessionStorage.getItem("blog_user")).toBeNull();
    expect(sessionStorage.getItem("blog_csrf_token")).toBeNull();
  });
});
