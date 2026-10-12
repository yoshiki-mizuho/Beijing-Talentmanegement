import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgL8sDAAGLAPQ8xSAqAAAAAElFTkSuQmCC",
  "base64"
);

test("本人がアイコン画像を登録して削除できる", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.getByLabel("アカウントメニューを開く").click();
  await page.getByRole("link", { name: "スキルプロフィール" }).click();
  await page.waitForURL("**/people/**");
  // 画面の準備（ハイドレーション）が終わる前にファイルを渡すと、変更の処理が動かないため待つ
  await page.waitForLoadState("networkidle");

  await page.locator('input[type="file"]').setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: onePixelPng
  });
  await expect(page.getByText("アイコン画像を変更しました。")).toBeVisible();

  await page.getByLabel("アカウントメニューを開く").click();
  const avatar = page.getByLabel("アカウントメニューを開く").locator("img");
  await expect(avatar).toBeVisible();
  const source = await avatar.getAttribute("src");
  expect(source).toBeTruthy();
  const response = await page.request.get(source!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^image\//);

  await page.getByRole("button", { name: "画像を削除" }).click();
  await expect(page.getByText("アイコン画像を削除しました。")).toBeVisible();
  await expect(page.getByLabel("アカウントメニューを開く").locator("img")).toHaveCount(0);
});
