import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapArticle, useContentStore } from "@/stores/content";

const contentApiMocks = vi.hoisted(() => ({
  getPublicArticlesMock: vi.fn(),
  getPublicCategoriesMock: vi.fn(),
  getPublicTagsMock: vi.fn(),
}));

vi.mock("@/api/content", () => ({
  getPublicArticles: contentApiMocks.getPublicArticlesMock,
  getPublicCategories: contentApiMocks.getPublicCategoriesMock,
  getPublicTags: contentApiMocks.getPublicTagsMock,
}));

describe("useContentStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("maps public content payloads into typed state", async () => {
    contentApiMocks.getPublicArticlesMock.mockResolvedValue({
      items: [
        {
          id: "article-1",
          title: "Typed article",
          slug: "typed-article",
          excerpt: "summary",
          content: "# heading",
          coverImage: "cover.png",
          status: "published",
          allowComment: true,
          viewCount: 12,
          likes: 3,
          commentCount: 2,
          author: {
            id: "author-1",
            username: "writer",
            nickname: "Writer",
            role: "author",
          },
          category: {
            id: "cat-1",
            name: "Engineering",
            slug: "engineering",
            description: "notes",
            articleCount: 1,
            color: "#185c52",
          },
          tags: [
            {
              id: "tag-1",
              name: "TypeScript",
              slug: "typescript",
              articleCount: 1,
            },
          ],
          publishedAt: "2026-04-20T00:00:00.000Z",
          createdAt: "2026-04-20T00:00:00.000Z",
          updatedAt: "2026-04-20T00:00:00.000Z",
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    });
    contentApiMocks.getPublicCategoriesMock.mockResolvedValue([
      {
        id: "cat-1",
        name: "Engineering",
        slug: "engineering",
        description: "notes",
        articleCount: 1,
        color: "#185c52",
      },
    ]);
    contentApiMocks.getPublicTagsMock.mockResolvedValue([
      {
        id: "tag-1",
        name: "TypeScript",
        slug: "typescript",
        articleCount: 1,
      },
    ]);

    const store = useContentStore();
    await store.loadPublicContent();

    expect(store.publicMeta.total).toBe(1);
    expect(store.articles[0].title).toBe("Typed article");
    expect(store.categories[0].name).toBe("Engineering");
    expect(store.tags[0].slug).toBe("typescript");
  });

  it("provides stable fallbacks when raw article data is invalid", () => {
    const article = mapArticle(null);

    expect(article.id).toBe("article-unknown");
    expect(article.category.name).toBe("未分类");
    expect(article.author.nickname).toBe("作者");
  });
});
