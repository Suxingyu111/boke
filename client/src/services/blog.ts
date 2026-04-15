import {
  articles,
  categories,
  links,
  siteSettings,
  siteStats,
  tags,
} from "@/data/mock";

export function listArticles(keyword = "") {
  const value = keyword.trim().toLowerCase();
  if (!value) {
    return articles;
  }

  return articles.filter((article) => {
    const haystack =
      `${article.title} ${article.excerpt} ${article.content}`.toLowerCase();
    return haystack.includes(value);
  });
}

export function getArticleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function listCategories() {
  return categories;
}

export function listTags() {
  return tags;
}

export function listLinks() {
  return links;
}

export function getSiteStats() {
  return siteStats;
}

export function getSiteSettings() {
  return siteSettings;
}
