import { expect, test } from "@playwright/test";

async function waitForPublicArticles(page: Parameters<typeof test>[0]["page"]) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/api/articles") &&
      response.request().method() === "GET",
  );
}

async function prepareHeaderSearch(
  page: Parameters<typeof test>[0]["page"],
  projectName: string,
) {
  const menuButton = page.getByRole("button", { name: "打开或关闭导航菜单" });
  if (
    /mobile|tablet|webkit|firefox/i.test(projectName) &&
    (await menuButton.isVisible().catch(() => false))
  ) {
    await menuButton.click();
  }

  return page.getByRole("searchbox").first();
}

async function getContrastRatio(
  page: Parameters<typeof test>[0]["page"],
  selector: string,
) {
  return page.locator(selector).first().evaluate((element) => {
    const parseColor = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) {
        return null;
      }

      const [r, g, b, alpha = "1"] = match[1]
        .split(",")
        .map((item) => item.trim());
      return {
        r: Number.parseFloat(r),
        g: Number.parseFloat(g),
        b: Number.parseFloat(b),
        a: Number.parseFloat(alpha),
      };
    };

    const blend = (
      foreground: { r: number; g: number; b: number; a: number },
      background: { r: number; g: number; b: number; a: number },
    ) => ({
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
      a: 1,
    });

    const getEffectiveBackground = (node: Element | null) => {
      let current = node;
      let background = { r: 247, g: 249, b: 248, a: 1 };

      while (current) {
        const styles = window.getComputedStyle(current);
        const parsed = parseColor(styles.backgroundColor);
        if (parsed && parsed.a > 0) {
          background = blend(parsed, background);
        }
        current = current.parentElement;
      }

      return background;
    };

    const toLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const transform = (channel: number) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };

      return (
        0.2126 * transform(r) +
        0.7152 * transform(g) +
        0.0722 * transform(b)
      );
    };

    const styles = window.getComputedStyle(element);
    const foreground = parseColor(styles.color);
    if (!foreground) {
      throw new Error("无法解析前景色");
    }

    const effectiveForeground = blend(
      foreground,
      getEffectiveBackground(element.parentElement),
    );
    const effectiveBackground = getEffectiveBackground(element);

    const foregroundLuminance = toLuminance(effectiveForeground);
    const backgroundLuminance = toLuminance(effectiveBackground);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);

    return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
  });
}

test.describe("公开站点联调", () => {
  test("首页和搜索页应正确请求公开内容接口", async ({ page }) => {
    const homeArticlesResponse = waitForPublicArticles(page);

    await page.goto("/");

    const articlesResponse = await homeArticlesResponse;
    expect(articlesResponse.ok()).toBeTruthy();
    const articlePayload = await articlesResponse.json();
    const heroArticle = [...(articlePayload?.data?.items ?? [])]
      .filter((article) => typeof article?.publishedAt === "string")
      .sort(
        (left, right) =>
          new Date(right.publishedAt).getTime() -
          new Date(left.publishedAt).getTime(),
      )[0];

    if (heroArticle?.coverImage) {
      await expect(page.locator(".home-hero__image")).toHaveAttribute(
        "src",
        heroArticle.coverImage,
      );
    }
    await expect(
      page.getByRole("heading", { name: /最近更新|还没有公开文章/ }),
    ).toBeVisible();

    const searchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/search") &&
        response.url().includes("keyword=NestJS") &&
        response.request().method() === "GET",
    );

    const searchbox = await prepareHeaderSearch(page, test.info().project.name);
    await expect(searchbox).toBeVisible();
    await searchbox.fill("NestJS");
    await page.getByRole("button", { name: "搜索" }).first().click();

    const searchResponse = await searchResponsePromise;
    expect(searchResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/search\?q=NestJS/);
    await expect(page.getByRole("heading", { name: "搜索文章" })).toBeVisible();
  });

  test("搜索页应展示命中的文章结果 @search-smoke", async ({ page }) => {
    const searchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/search") &&
        response.url().includes("keyword=Vue") &&
        response.request().method() === "GET",
    );

    await page.goto("/search?q=Vue");

    const searchResponse = await searchResponsePromise;
    expect(searchResponse.ok()).toBeTruthy();

    const payload = await searchResponse.json();
    expect(payload?.data?.total).toBeGreaterThan(0);

    await expect(page.getByRole("heading", { name: "搜索文章" })).toBeVisible();
    await expect(page.getByText(/找到 [1-9]\d* 篇文章/)).toBeVisible();

    const resultLinks = page.locator('a[href^="/articles/"]');
    await expect(resultLinks.first()).toBeVisible();

    const vueResult = resultLinks.filter({ hasText: /Vue/i });
    await expect(vueResult.first()).toBeVisible();

    const highlightedKeyword = page.locator("mark").filter({ hasText: /Vue/i });
    if ((await highlightedKeyword.count()) > 0) {
      await expect(highlightedKeyword.first()).toBeVisible();
    }
  });

  test("关于页和友情链接页应正确处理公开页面接口", async ({ page }) => {
    const aboutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pages/about") &&
        response.request().method() === "GET",
    );

    await page.goto("/about");

    const aboutResponse = await aboutResponsePromise;
    expect([200, 404]).toContain(aboutResponse.status());
    await expect(
      page.getByRole("heading", { name: /关于|暂不可用/ }).first(),
    ).toBeVisible();

    const linksResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/friend-links") &&
        response.request().method() === "GET",
    );

    await page.goto("/links");

    const linksResponse = await linksResponsePromise;
    expect(linksResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "友情链接" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "申请友链" })).toBeVisible();
  });

  test("关键公开页面在主要断点下应保持核心区块可见", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /最近更新|还没有公开文章/ }),
    ).toBeVisible();

    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "文章分类" })).toBeVisible();

    await page.goto("/tags");
    await expect(page.getByRole("heading", { name: "标签索引" })).toBeVisible();

    await page.goto("/search?q=NestJS");
    await expect(page.getByRole("heading", { name: "搜索文章" })).toBeVisible();

    await page.goto("/ecosystem");
    await expect(page.getByRole("heading", { name: "内容生态" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "按年月回看写作轨迹" }),
    ).toBeVisible();

    await page.goto("/links");
    await expect(page.getByRole("heading", { name: "申请友链" })).toBeVisible();
  });

  test("搜索页次级说明文字应满足 WCAG AA 对比度", async ({ page }) => {
    await page.goto("/search?q=NestJS");
    await expect(page.getByRole("heading", { name: "搜索文章" })).toBeVisible();

    const contrastRatio = await getContrastRatio(page, "form + div");
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  test("首页主内容骨架应稳定", async ({ page }) => {
    const responsePromise = waitForPublicArticles(page);
    await page.goto("/");
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator(".home-hero__image")).toBeVisible();
    await expect(page.locator(".home-actions .home-button")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "阅读最新文章" })).toBeVisible();
    await expect(page.getByRole("link", { name: "继续向下" })).toBeVisible();

    const heroBox = await page.locator(".home-hero").boundingBox();
    expect(heroBox?.height ?? 0).toBeGreaterThan(420);
  });

  test("详情页在公开内容存在时应显示阅读主区与元信息", async ({ page }) => {
    const articlesResponse = await page.request.get("/api/articles?page=1&pageSize=1");
    test.skip(
      !articlesResponse.ok(),
      `当前环境公开文章接口不可用（status=${articlesResponse.status()}）。`,
    );

    const payload = await articlesResponse.json();
    const firstArticle = payload?.data?.items?.[0] || payload?.data?.[0];
    test.skip(!firstArticle?.slug, "当前环境没有可用于详情页验证的公开文章。");

    await page.goto(`/articles/${firstArticle.slug}`);
    await expect(page.getByRole("article")).toBeVisible();
    await expect(page.locator(".markdown-body")).toBeVisible();

    const metadataPanel = page
      .locator("aside section")
      .filter({ hasText: "分类与标签" })
      .first();
    await expect(metadataPanel).toBeVisible();
    await expect(metadataPanel.getByText("分类与标签")).toBeVisible();

    if (firstArticle?.category?.name) {
      await expect(metadataPanel.getByText(firstArticle.category.name)).toBeVisible();
    }
  });
});
