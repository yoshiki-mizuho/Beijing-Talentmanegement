import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  // e2e/cleanup の *.test.ts は vitest 用、e2e/ui-check は画面撮影用（npm run ui:check）。
  testMatch: "**/*.spec.ts",
  testIgnore: "**/ui-check/**",
  globalTeardown: "./e2e/global-teardown.ts",
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // 社内ランナーは遅いので、CI では待ち時間を延ばす。
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run start",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
