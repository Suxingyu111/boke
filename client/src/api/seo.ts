import { request } from "@/api/http";

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  author?: string;
  publishedAt?: string;
  category?: string;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
}

export async function getSiteSeoSettings() {
  const response = await request<Record<string, unknown>>("/seo/site");
  return response.data;
}

export async function getArticleSeoMeta(slug: string) {
  const response = await request<SeoMeta>(`/seo/articles/${slug}`);
  return response.data;
}

export async function getPageSeoMeta(slug: string) {
  const response = await request<SeoMeta>(`/seo/pages/${slug}`);
  return response.data;
}

export async function getSitemap(baseUrl: string) {
  const response = await request<SitemapUrl[]>("/seo/sitemap", { baseUrl });
  return response.data;
}
