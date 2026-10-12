import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("ヘッダーの通知ポップオーバーから通知一覧へ移動できる", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);

  await page.getByLabel(/通知を開く/).click();
  await page.getByRole("link", { name: "すべて見る" }).click();

  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading", { level: 1, name: "通知" })).toBeVisible();
});
