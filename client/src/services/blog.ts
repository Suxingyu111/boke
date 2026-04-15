import { links, siteSettings } from "@/data/mock";
import { useContentStore } from "@/stores/content";

export function listArticles(keyword = "") {
  const contentStore = useContentStore();
  const value = keyword.trim().toLowerCase();
  const articles = contentStore.publishedArticles;

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
  const contentStore = useContentStore();
  return contentStore.publishedArticles.find(
    (article) => article.slug === slug,
  );
}

export function listCategories() {
  return useContentStore().visibleCategories;
}

export function listTags() {
  return useContentStore().tagCloud;
}

export function listLinks() {
  return links;
}

export function getSiteStats() {
  return useContentStore().stats;
}

export function getSiteSettings() {
  return siteSettings;
}
