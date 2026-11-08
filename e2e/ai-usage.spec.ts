import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("ADMINがAIの利用状況を確認できる", async ({ page }) => {
  const data = createE2eTestData();
  try {
  const department = await data.createDepartment("AI利用部署");
  const admin = await data.createMember({ label: "AI利用管理者", departmentId: department.id, role: "ADMIN" });
  const target = await data.createMember({ label: "AI利用対象", departmentId: department.id });
  await login(page, admin.credential);
  await page.goto("/members");
  await page.getByLabel("キーワード").fill(target.member.employeeNo);
  await page.getByRole("button", { name: `${target.member.name}の詳細を開く` }).click();
  await page.getByRole("tab", { name: "育成のヒント" }).click();
  await page.getByRole("button", { name: /ヒントを作る|作り直す/ }).click();
  await expect(page.getByText("AI", { exact: true })).toBeVisible();
  await page.goto("/ai-usage");
  await expect(
    page.getByRole("heading", { name: "AI の利用状況" }),
  ).toBeVisible();
  await expect(page.getByText("AI", { exact: true }).first()).toBeVisible();
  } finally {
    await data.cleanup();
  }
});

for (const role of ["MANAGER", "MEMBER"] as const) {
  test(`${role}はAIの利用状況に入れない`, async ({ page }) => {
    await login(page, credentials[role]);
    await page.goto("/ai-usage");
    await expect(page).toHaveURL(/\/dashboard/);
  });
}
