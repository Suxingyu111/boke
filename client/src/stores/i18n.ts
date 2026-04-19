import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as i18nApi from "@/api/i18n";

const localeStorageKey = "blog_locale";

const fallbackTranslations: Record<i18nApi.SupportedLocale, Record<string, string>> = {
  "zh-CN": {
    "site.home": "首页",
    "site.categories": "分类",
    "site.tags": "标签",
    "site.archives": "归档",
    "site.about": "关于",
    "site.guestbook": "留言板",
    "site.profile": "个人中心",
    "site.login": "登录",
    "site.register": "注册",
    "site.logout": "退出",
    "site.admin": "后台",
    "site.search": "搜索",
  },
  "en-US": {
    "site.home": "Home",
    "site.categories": "Categories",
    "site.tags": "Tags",
    "site.archives": "Archives",
    "site.about": "About",
    "site.guestbook": "Guestbook",
    "site.profile": "Profile",
    "site.login": "Log in",
    "site.register": "Register",
    "site.logout": "Log out",
    "site.admin": "Admin",
    "site.search": "Search",
  },
};

function readLocale(): i18nApi.SupportedLocale {
  const value = localStorage.getItem(localeStorageKey);
  return value === "en-US" ? "en-US" : "zh-CN";
}

function getFallbackTranslations(locale: i18nApi.SupportedLocale) {
  return fallbackTranslations[locale];
}

export const useI18nStore = defineStore("i18n", {
  state: () => ({
    locale: readLocale(),
    locales: [
      { code: "zh-CN", name: "中文" },
      { code: "en-US", name: "English" },
    ] as i18nApi.LocaleOption[],
    translations: { ...fallbackTranslations[readLocale()] },
    loading: false,
    errorMessage: "",
  }),
  actions: {
    t(key: string) {
      return this.translations[key] ?? getFallbackTranslations(this.locale)[key] ?? key;
    },
    async load(locale?: i18nApi.SupportedLocale) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const locales = await i18nApi.getLocales();
        const activeLocale = locale ?? (await i18nApi.getDefaultLocale());
        const translations = await i18nApi.getTranslations(activeLocale);
        this.locales = locales;
        this.translations = {
          ...getFallbackTranslations(activeLocale),
          ...translations,
        };
        this.locale = activeLocale;
        localStorage.setItem(localeStorageKey, activeLocale);
      } catch (error) {
        const activeLocale = locale ?? this.locale;
        this.translations = { ...getFallbackTranslations(activeLocale) };
        this.locale = activeLocale;
        localStorage.setItem(localeStorageKey, activeLocale);
        this.errorMessage = getApiErrorMessage(
          error,
          "语言接口暂不可用，已使用本地翻译包",
        );
      } finally {
        this.loading = false;
      }
    },
    async switchLocale(locale: i18nApi.SupportedLocale) {
      await this.load(locale);
    },
  },
});
