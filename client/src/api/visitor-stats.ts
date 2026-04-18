import { post, request } from "@/api/http";

export interface RecordVisitPayload {
  path: string;
  referer?: string;
  stayDuration?: number;
}

export interface TodayVisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  avgStayDuration: number;
}

export interface TopPageItem {
  path: string;
  visits: number;
  uniqueVisitors?: number;
}

export interface RefererItem {
  referer: string;
  visits: number;
}

export interface DeviceStatsGroupItem {
  name: string;
  count: number;
}

export interface DeviceStatsResponse {
  devices: DeviceStatsGroupItem[];
  browsers: DeviceStatsGroupItem[];
  os: DeviceStatsGroupItem[];
}

export async function recordVisit(payload: RecordVisitPayload) {
  const response = await post<{ recorded: boolean }, RecordVisitPayload>(
    "/stats/visit",
    payload,
  );
  return response.data;
}

export async function getTodayVisitorStats() {
  const response = await request<TodayVisitorStats>("/admin/stats/today");
  return response.data;
}

export async function getTopPages(limit = 20, days = 30) {
  const response = await request<TopPageItem[]>("/admin/stats/top-pages", {
    limit,
    days,
  });
  return response.data;
}

export async function getRefererStats(days = 30) {
  const response = await request<RefererItem[]>("/admin/stats/referers", {
    days,
  });
  return response.data;
}

export async function getDeviceStats(days = 30) {
  const response = await request<DeviceStatsResponse>("/admin/stats/devices", {
    days,
  });
  return response.data;
}
