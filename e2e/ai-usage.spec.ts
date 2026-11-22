import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("ADMINがAIの利用状況を確認できる", async ({ page }) => {
  const data = createE2eTestData();
  try {
  const node = await data.createDepartment("AI利用部署");
  const admin = await data.createMember({ label: "AI利用管理者", nodeId: node.id, role: "ADMIN" });
  await login(page, admin.credential);
  // 育成のヒントは H-5a で予約の形になり、利用の記録（AiUsageLog）には残らない。
  // 予約の回数を出す画面への作り替えは H-5b で行う。
  await page.goto("/talent/ai-usage");
  await expect(
    page.getByRole("heading", { name: "AI の利用状況" }),
  ).toBeVisible();
  } finally {
    await data.cleanup();
  }
});

for (const role of ["MANAGER", "MEMBER"] as const) {
  test(`${role}はAIの利用状況に入れない`, async ({ page }) => {
    await login(page, credentials[role]);
    await page.goto("/talent/ai-usage");
    await expect(page).toHaveURL(/\/talent\/dashboard/);
  });
}
