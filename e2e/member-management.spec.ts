import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者がメンバーを登録し、詳細で役職を更新して無効化できる", async ({
  browser
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const uniqueSuffix = `${Date.now()}-${test.info().workerIndex}`;
  const employeeNo = `E2E-${uniqueSuffix}`;
  const memberName = `E2Eメンバー-${uniqueSuffix}`;
  const email = `member-${uniqueSuffix}@example.com`;
  const updatedJobTitle = `E2E役職-${uniqueSuffix}`;

  try {
    await admin.page.goto("/members");
    await admin.page
      .getByRole("button", { name: "メンバーを追加", exact: true })
      .click();

    const createDialog = admin.page.getByRole("dialog", {
      name: "メンバーを追加"
    });
    await createDialog.getByLabel("社員番号").fill(employeeNo);
    await createDialog.getByLabel("氏名").fill(memberName);
    await createDialog.getByLabel("メール").fill(email);
    await createDialog
      .getByRole("button", { name: "メンバーを追加", exact: true })
      .click();
    await expect(
      admin.page.getByText(
        "メンバーを登録しました。初期認証情報を安全な経路で共有してください。"
      )
    ).toBeVisible();

    await admin.page.getByLabel("キーワード").fill(employeeNo);
    const createdRow = admin.page.getByRole("row").filter({ hasText: employeeNo });
    await expect(createdRow).toBeVisible();
    await createdRow
      .getByRole("button", { name: `${memberName}の詳細を開く` })
      .click();

    const detailDialog = admin.page.getByRole("dialog", {
      name: `${memberName}の詳細`
    });
    await detailDialog.getByLabel("役職").fill(updatedJobTitle);
    await detailDialog
      .getByRole("button", { name: "基本情報を更新", exact: true })
      .click();
    await expect(admin.page.getByText("メンバー情報を更新しました。"))
      .toBeVisible();
    await expect(detailDialog.getByLabel("役職")).toHaveValue(updatedJobTitle);

    await detailDialog
      .getByRole("button", { name: "無効化", exact: true })
      .click();
    const deactivateDialog = admin.page.getByRole("dialog", {
      name: "メンバーを無効化しますか"
    });
    await deactivateDialog
      .getByRole("button", { name: "無効化する", exact: true })
      .click();
    await expect(admin.page.getByText("メンバーを無効化しました。"))
      .toBeVisible();
    await expect(detailDialog.getByLabel("状態")).toHaveValue("INACTIVE");
  } finally {
    await admin.context.close();
  }
});
