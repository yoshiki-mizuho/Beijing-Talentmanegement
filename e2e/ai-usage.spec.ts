import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("ADMINがAIの利用状況を確認できる", async ({ page }) => {
  await login(page, credentials.ADMIN);
  await page.goto("/members");
  await page.getByRole("button", { name: "Member Userの詳細を開く" }).click();
  await page.getByRole("tab", { name: "育成のヒント" }).click();
  await page.getByRole("button", { name: /ヒントを作る|作り直す/ }).click();
  await expect(page.getByText("AI", { exact: true })).toBeVisible();
  await page.goto("/ai-usage");
  await expect(
    page.getByRole("heading", { name: "AI の利用状況" }),
  ).toBeVisible();
  await expect(page.getByText("AI", { exact: true }).first()).toBeVisible();
});

for (const role of ["MANAGER", "MEMBER"] as const) {
  test(`${role}はAIの利用状況に入れない`, async ({ page }) => {
    await login(page, credentials[role]);
    await page.goto("/ai-usage");
    await expect(page).toHaveURL(/\/dashboard/);
  });
}
