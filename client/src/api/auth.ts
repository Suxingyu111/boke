import axios from "axios";
import { post, request } from "@/api/http";
import type {
  AuthResponse,
  OAuthProviders,
  AuthUser,
  LoginPayload,
  RegistrationAvailability,
  RegistrationAvailabilityPayload,
  RegistrationCodeSentResponse,
  RegisterPayload,
  RegistrationVerificationResponse,
  SendRegistrationCodePayload,
  VerifyRegistrationCodePayload,
} from "@/types/blog";

export async function login(payload: LoginPayload) {
  const response = await post<AuthResponse, LoginPayload>(
    "/auth/login",
    payload,
  );
  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await post<AuthResponse, RegisterPayload>(
    "/auth/register",
    payload,
  );
  return response.data;
}

export async function checkRegistrationAvailability(
  payload: RegistrationAvailabilityPayload,
) {
  const response = await post<
    RegistrationAvailability,
    RegistrationAvailabilityPayload
  >("/auth/register/check-availability", payload);
  return response.data;
}

export async function sendRegistrationCode(payload: SendRegistrationCodePayload) {
  const response = await post<
    RegistrationCodeSentResponse,
    SendRegistrationCodePayload
  >("/auth/register/send-code", payload);
  return response.data;
}

export async function verifyRegistrationCode(
  payload: VerifyRegistrationCodePayload,
) {
  const response = await post<
    RegistrationVerificationResponse,
    VerifyRegistrationCodePayload
  >("/auth/register/verify-code", payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await request<AuthUser>("/auth/me");
  return response.data;
}

export async function getCurrentAdminUser() {
  const response = await request<AuthUser>("/auth/admin/me");
  return response.data;
}

export async function getOAuthProviders() {
  const response = await request<OAuthProviders>("/auth/oauth/providers");
  return response.data;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "请求失败，请稍后再试",
) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string | string[]; errors?: unknown }
      | undefined;

    if (Array.isArray(payload?.message)) {
      return payload.message.join("；");
    }

    if (payload?.message) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getApiStatusCode(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
}
