import { expect, type Page } from "@playwright/test";

// 未確認のレベルアップ・応援演出が残っていると、次のテストの操作をふさぐため閉じておく
export async function dismissExistingLevelUpDialogs(page: Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog").filter({ hasText: /LEVEL UP|CHEER/ });
    if ((await dialog.count()) === 0) return;

    await dialog.getByRole("button", { name: "ダイアログを閉じる" }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
  }
  throw new Error("既存のレベルアップ・応援通知を10件以内に確認できませんでした。");
}
