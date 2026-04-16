import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
    channel: "msedge",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});