import { expect, test } from "@playwright/test";

const adminUsername = process.env.E2E_ADMIN_USERNAME || "admin";
const adminPassword = process.env.E2E_ADMIN_PASSWORD || "admin123456";

async function loginAsAdmin(page: Parameters<typeof test>[0]["page"]) {
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
  );

  await page.goto("/login");
  await page.getByLabel("用户名或邮箱").fill(adminUsername);
  await page.getByLabel("密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录" }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
}

test.describe("后台联调", () => {
  test("管理员登录后应能加载仪表盘和管理页", async ({ page }) => {
    await loginAsAdmin(page);

    const dashboardStatsResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/dashboard/stats") &&
        response.request().method() === "GET",
    );

    await expect(page).toHaveURL(/\/admin$/);
    expect((await dashboardStatsResponse).ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible();

    const articlesResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/articles") &&
        response.request().method() === "GET",
    );
    await page.getByRole("link", { name: "文章管理" }).click();
    expect((await articlesResponse).ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();

    const pagesResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/pages") &&
        response.request().method() === "GET",
    );
    await page.getByRole("link", { name: "页面管理" }).click();
    expect((await pagesResponse).ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "页面管理" })).toBeVisible();
  });

  test("系统设置页应能读取并提交设置接口", async ({ page }) => {
    await loginAsAdmin(page);

    const settingsGetResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/settings") &&
        response.request().method() === "GET",
    );

    await page.goto("/admin/settings");
    expect((await settingsGetResponse).ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/settings/batch") &&
        response.request().method() === "PUT",
    );

    await page.getByRole("button", { name: /保存设置|正在保存/ }).click();

    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok()).toBeTruthy();
    await expect(page.getByText("设置已保存")).toBeVisible();
  });
});