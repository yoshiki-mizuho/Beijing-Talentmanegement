import { expect, type Page } from "@playwright/test";

// 承認済みで未確認のレベルアップ演出が残っていると、次のテストの操作をふさぐため閉じておく
export async function dismissExistingLevelUpDialogs(page: Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog").filter({ hasText: "LEVEL UP" });
    if ((await dialog.count()) === 0) return;

    await dialog.getByRole("button", { name: "ダイアログを閉じる" }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
  }
  throw new Error("既存のレベルアップ通知を10件以内に確認できませんでした。");
}
