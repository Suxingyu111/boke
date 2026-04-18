import { put, request } from "@/api/http";

export type SupportedLocale = "zh-CN" | "en-US";

export interface LocaleOption {
  code: SupportedLocale;
  name: string;
}

export async function getLocales() {
  const response = await request<LocaleOption[]>("/i18n/locales");
  return response.data;
}

export async function getDefaultLocale() {
  const response = await request<SupportedLocale>("/i18n/default");
  return response.data;
}

export async function getTranslations(locale: SupportedLocale) {
  const response = await request<Record<string, string>>(
    `/i18n/translations/${locale}`,
  );
  return response.data;
}

export async function setDefaultLocale(locale: SupportedLocale) {
  const response = await put<{ locale: SupportedLocale }, { locale: SupportedLocale }>(
    "/i18n/default",
    { locale },
  );
  return response.data;
}
