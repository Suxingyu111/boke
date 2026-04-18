import type { SeoMeta } from "@/api/seo";
import type { SiteSettings } from "@/types/blog";

function upsertMeta(name: string, content: string, attr = "name") {
  if (!content) {
    return;
  }

  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${name}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.append(element);
  }

  element.content = content;
}

function upsertLink(rel: string, href: string) {
  if (!href) {
    return;
  }

  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.append(element);
  }
  element.href = href;
}

export function applySeo(meta: SeoMeta, settings: SiteSettings) {
  const title = meta.title || settings.title;
  const description = meta.description || settings.description;
  const keywords = meta.keywords || settings.keywords;
  const image = meta.ogImage || settings.ogImage;

  document.title = title.includes(settings.title)
    ? title
    : `${title} | ${settings.title}`;
  document.documentElement.lang = "zh-CN";

  upsertMeta("description", description);
  upsertMeta("keywords", keywords);
  upsertMeta("author", meta.author || settings.author);
  upsertMeta("og:type", meta.ogType || "website", "property");
  upsertMeta("og:title", meta.ogTitle || title, "property");
  upsertMeta("og:description", meta.ogDescription || description, "property");
  upsertMeta("og:image", image, "property");
  upsertMeta("twitter:card", image ? "summary_large_image" : "summary");
  upsertLink("icon", settings.favicon);
  upsertLink("canonical", window.location.href.split("?")[0]);
}
