import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const axiosMocks = vi.hoisted(() => {
  const getMock = vi.fn();
  const createMock = vi.fn(() => ({
    get: getMock,
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }));

  return {
    getMock,
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
});
