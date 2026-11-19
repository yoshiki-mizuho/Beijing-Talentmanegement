// 撮影の前後でテストの補助が DB を読むため、.env の接続先を読み込む
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  outputDir: "../../test-results",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, viewport: { width: 1440, height: 900 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: "npm run start", url: `${baseURL}/health`, reuseExistingServer: true, timeout: 120_000 }
});
