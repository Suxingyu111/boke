import { put, request } from "@/api/http";
import type { SiteSettings } from "@/types/blog";

export type SettingsMap = Record<string, unknown>;

interface UpsertSettingPayload {
  settingKey: string;
  settingValue: string;
  valueType: "string";
  groupName: "general";
  description: string;
  isPublic: true;
}

interface BatchSettingsPayload {
  settings: UpsertSettingPayload[];
}

const settingDescriptions: Record<keyof SiteSettings, string> = {
  title: "博客标题",
  subtitle: "副标题",
  description: "站点描述",
  icp: "备案信息",
  copyright: "版权信息",
  socialLinks: "社交链接",
};

const settingKeys: Record<keyof SiteSettings, string> = {
  title: "site_title",
  subtitle: "site_subtitle",
  description: "site_description",
  icp: "site_icp",
  copyright: "site_copyright",
  socialLinks: "social_links",
};

function stringifySettingValue(value: SiteSettings[keyof SiteSettings]) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function getPublicSettings() {
  const response = await request<SettingsMap>("/settings");
  return response.data;
}

export async function getAdminSettings() {
  const response = await request<SettingsMap>("/admin/settings");
  return response.data;
}

export async function saveSiteSettings(settings: SiteSettings) {
  const payload: BatchSettingsPayload = {
    settings: (
      Object.keys(settingDescriptions) as Array<keyof SiteSettings>
    ).map((key) => ({
      settingKey: settingKeys[key],
      settingValue: stringifySettingValue(settings[key]),
      valueType: "string",
      groupName: "general",
      description: settingDescriptions[key],
      isPublic: true,
    })),
  };

  const response = await put<SettingsMap, BatchSettingsPayload>(
    "/admin/settings/batch",
    payload,
  );
  return response.data;
}
