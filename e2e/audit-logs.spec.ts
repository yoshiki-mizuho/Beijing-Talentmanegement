import { expect, test } from "@playwright/test";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();
test("管理者が監査ログの差分と期間入力を確認できる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const categoryName = `E2E監査カテゴリ-${Date.now()}-${test.info().workerIndex}`;
  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    const dialog = admin.page.getByRole("dialog", { name: "カテゴリを管理" });
    await dialog.getByLabel("カテゴリ名").first().fill(categoryName);
    await dialog.getByRole("button", { name: "追加", exact: true }).click();
    await expect(
      admin.page.getByText("カテゴリを登録しました。"),
    ).toBeVisible();
    await admin.page.goto("/audit-logs?period=today");
    const row = admin.page
      .locator("details")
      .filter({ hasText: categoryName })
      .first();
    await expect(row).toContainText("作成");
    await row.locator("summary").click();
    await expect(row).toContainText(categoryName);
    await admin.page.getByRole("button", { name: "期間を指定" }).click();
    // 開始日は今日のまま、終了日だけを過去にして「開始日＞終了日」にする
    await admin.page.getByLabel("終了日").fill("2026-01-05");
    await expect(
      admin.page.getByText("開始日は終了日以前にしてください"),
    ).toBeVisible();
    await expect(admin.page).not.toHaveURL(/to=2026-01-05/);
  } finally {
    await admin.context.close();
  }
});
