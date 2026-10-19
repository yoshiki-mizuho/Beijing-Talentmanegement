import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("MANAGERが育成のヒントを作り1on1メモへ追加できる", async ({ page }) => {
  await login(page, credentials.MANAGER);
  await page.goto("/members");
  await page.getByRole("button", { name: "Member Userの詳細を開く" }).click();
  await page.getByRole("tab", { name: "育成のヒント" }).click();
  await page.getByRole("button", { name: /ヒントを作る|作り直す/ }).click();

  await expect(page.getByText("AI", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "得意なこと" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "目標ロールまでに伸ばすとよいスキル" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "次の一歩" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1on1 で話すとよい話題" }),
  ).toBeVisible();

  const addButton = page
    .getByRole("button", { name: "＋ 1on1 メモに追加" })
    .first();
  if (await addButton.isVisible()) await addButton.click();
  await expect(page.getByText("✓ 追加済み").first()).toBeVisible();

  await page.getByRole("tab", { name: "1on1 メモ" }).click();
  await expect(page.getByRole("listitem").first()).toBeVisible();
  await page.getByRole("button", { name: "ダイアログを閉じる" }).click();
  await expect(page.getByText("✦ ヒント").first()).toBeVisible();
});

test("MEMBERは育成のヒントを画面とメンバーAPIから利用できない", async ({
  page,
}) => {
  await login(page, credentials.MEMBER);
  await page.goto("/members");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("tab", { name: "育成のヒント" })).toHaveCount(0);

  const response = await page.request.get("/api/members");
  expect(response.status()).toBe(403);
});
