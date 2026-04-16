import { expect, test } from "@playwright/test";

test.describe("公开站点联调", () => {
  test("首页和搜索页应正确请求公开内容接口", async ({ page }) => {
    const homeArticlesResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/articles") &&
        response.request().method() === "GET",
    );

    await page.goto("/");

    const articlesResponse = await homeArticlesResponse;
    expect(articlesResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: /最近更新|还没有公开文章/ })).toBeVisible();

    const searchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/articles") &&
        response.url().includes("keyword=NestJS") &&
        response.request().method() === "GET",
    );

    await page.getByRole("searchbox").first().fill("NestJS");
    await page.getByRole("button", { name: "搜索" }).first().click();

    const searchResponse = await searchResponsePromise;
    expect(searchResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/search\?q=NestJS/);
    await expect(page.getByRole("heading", { name: "搜索文章" })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: /关于|暂不可用/ }).first()).toBeVisible();

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
});