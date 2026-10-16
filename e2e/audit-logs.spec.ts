import { expect, test } from "@playwright/test";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();
test("管理者が監査ログの差分確認とCSV出力をできる", async ({ browser }) => {
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
    const response = await admin.page.request.get(
      "/api/audit-logs/export?period=today",
    );
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('"日時","操作した人"');
  } finally {
    await admin.context.close();
  }
});
