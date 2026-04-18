import type {
  Browser,
  BrowserContextOptions,
  Page,
  StorageState,
  TestInfo,
} from "@playwright/test";
import { expect, test } from "@playwright/test";

const adminUsername = process.env.E2E_ADMIN_USERNAME || "admin";
const adminPassword = process.env.E2E_ADMIN_PASSWORD || "admin123456";

let authenticatedStorageState: StorageState | null = null;

function getContextOptions(
  testInfo: TestInfo,
  storageState?: StorageState,
): BrowserContextOptions {
  const useOptions = testInfo.project.use;

  return {
    storageState,
    baseURL: typeof useOptions.baseURL === "string" ? useOptions.baseURL : undefined,
    colorScheme: useOptions.colorScheme,
    deviceScaleFactor:
      typeof useOptions.deviceScaleFactor === "number"
        ? useOptions.deviceScaleFactor
        : undefined,
    hasTouch: typeof useOptions.hasTouch === "boolean" ? useOptions.hasTouch : undefined,
    isMobile: typeof useOptions.isMobile === "boolean" ? useOptions.isMobile : undefined,
    locale: typeof useOptions.locale === "string" ? useOptions.locale : undefined,
    timezoneId: typeof useOptions.timezoneId === "string" ? useOptions.timezoneId : undefined,
    userAgent: typeof useOptions.userAgent === "string" ? useOptions.userAgent : undefined,
    viewport: useOptions.viewport ?? undefined,
  };
}

async function loginAsAdmin(page: Page) {
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

async function getAuthenticatedStorageState(
  browser: Browser,
  testInfo: TestInfo,
): Promise<StorageState> {
  if (authenticatedStorageState) {
    return authenticatedStorageState;
  }

  const setupContext = await browser.newContext(getContextOptions(testInfo));
  const setupPage = await setupContext.newPage();

  await loginAsAdmin(setupPage);
  authenticatedStorageState = await setupContext.storageState();

  await setupContext.close();

  return authenticatedStorageState;
}

async function createAuthenticatedPage(
  browser: Browser,
  testInfo: TestInfo,
): Promise<{ page: Page; cleanup: () => Promise<void> }> {
  const storageState = await getAuthenticatedStorageState(browser, testInfo);
  const context = await browser.newContext(getContextOptions(testInfo, storageState));
  const page = await context.newPage();

  return {
    page,
    cleanup: async () => {
      await context.close().catch(() => undefined);
    },
  };
}

test.describe("后台联调", () => {
  test.describe.configure({ mode: "serial" });

  test("管理员登录后应能加载仪表盘和管理页", async ({ browser }, testInfo) => {
    const { page, cleanup } = await createAuthenticatedPage(browser, testInfo);

    try {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible();

      await page.getByRole("link", { name: "文章管理" }).click();
      await expect(page).toHaveURL(/\/admin\/articles$/);
      await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();

      await page.getByRole("link", { name: "页面管理" }).click();
      await expect(page).toHaveURL(/\/admin\/pages$/);
      await expect(page.getByRole("heading", { name: "页面管理" })).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("系统设置页应能读取并提交设置接口", async ({ browser }, testInfo) => {
    const { page, cleanup } = await createAuthenticatedPage(browser, testInfo);

    try {
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
    } finally {
      await cleanup();
    }
  });

  test("后台核心页面在主要断点下应保持可操作", async ({ browser }, testInfo) => {
    const { page, cleanup } = await createAuthenticatedPage(browser, testInfo);

    try {
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "数据概览" })).toBeVisible();
      await expect(page.getByRole("link", { name: "文章管理" })).toBeVisible();

      await page.goto("/admin/articles");
      await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();
      await expect(page.getByRole("button", { name: "新建文章" })).toBeVisible();

      await page.goto("/admin/pages");
      await expect(page.getByRole("heading", { name: "页面管理" })).toBeVisible();
      await expect(page.getByRole("button", { name: /新建页面|新建友链/ })).toBeVisible();

      await page.goto("/admin/settings");
      await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
      await expect(page.getByRole("button", { name: /保存设置|正在读取|正在保存/ })).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("后台文章管理页主工作区视觉基线应稳定", async ({ browser }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "视觉基线当前仅在 Chromium Desktop 维护，其他项目保留结构验证。",
    );

    const { page, cleanup } = await createAuthenticatedPage(browser, testInfo);

    try {
      await page.goto("/admin/articles");

      await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();
      const categoryOptions = page
        .getByRole("combobox", { name: "分类" })
        .locator("option");
      await expect(categoryOptions).not.toHaveCount(0);

      await expect(page.locator("form.ui-surface").first()).toHaveScreenshot(
        "admin-article-editor-panel.png",
        {
          animations: "disabled",
        },
      );
    } finally {
      await cleanup();
    }
  });
});
