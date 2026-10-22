import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("MEMBERがロールを確認して目標を変更し元に戻せる", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  try {
    await member.page.goto("/roles");
    await dismissExistingLevelUpDialogs(member.page);
    const originalTarget = member.page
      .getByText("目標", { exact: true })
      .first()
      .locator("xpath=ancestor::a");
    const originalHref = await originalTarget.getAttribute("href");
    const targetButton = member.page.getByRole("button", {
      name: "目標にする",
    });
    if ((await targetButton.count()) === 0) {
      await member.page
        .locator('a[href^="/roles?role="]')
        .filter({ hasNot: member.page.getByText("目標", { exact: true }) })
        .first()
        .click();
    }
    await member.page.getByRole("button", { name: "目標にする" }).click();
    await expect(
      member.page.getByText("目標ロールを更新しました。"),
    ).toBeVisible();

    if (originalHref) {
      await member.page.goto(originalHref);
      await member.page.getByRole("button", { name: "目標にする" }).click();
      await expect(
        member.page.getByText("目標ロールを更新しました。"),
      ).toBeVisible();
    }
  } finally {
    await member.context.close();
  }
});

test("ADMINが必要なスキルを2つ選んでロールを作成できる", async ({
  browser,
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const roleName = `E2E要件付きロール-${Date.now()}-${test.info().workerIndex}`;
  try {
    await admin.page.goto("/roles");
    await admin.page.getByRole("button", { name: "ロールを追加" }).click();
    const dialog = admin.page.getByRole("dialog", { name: "新規ロール" });
    await dialog.getByLabel("ロール名").fill(roleName);
    await dialog.getByRole("button", { name: "＋ スキルを追加" }).click();
    await dialog.getByRole("button", { name: "＋ スキルを追加" }).click();
    const skillSelects = dialog.getByLabel("必要なスキル");
    const firstValue = await skillSelects
      .nth(0)
      .locator("option")
      .nth(1)
      .getAttribute("value");
    if (!firstValue) throw new Error("ロール要件に使うスキルがありません。");
    await skillSelects.nth(0).selectOption(firstValue);
    const secondValue = await skillSelects
      .nth(1)
      .locator("option")
      .nth(1)
      .getAttribute("value");
    if (!secondValue)
      throw new Error("2つ目のロール要件に使うスキルがありません。");
    await skillSelects.nth(1).selectOption(secondValue);
    await dialog.getByRole("button", { name: "ロールを登録" }).click();
    await expect(admin.page.getByText("ロールを登録しました。")).toBeVisible();

    await admin.page.getByRole("link", { name: new RegExp(roleName) }).click();
    await expect(admin.page.getByRole("row")).toHaveCount(3);
    await admin.page.getByRole("button", { name: "編集" }).click();
    const editDialog = admin.page.getByRole("dialog", {
      name: `${roleName}を編集`,
    });
    await editDialog
      .getByRole("button", { name: "削除", exact: true })
      .last()
      .click();
    await admin.page
      .getByRole("dialog", { name: "ロールを削除しますか" })
      .getByRole("button", { name: "削除する" })
      .click();
    await expect(admin.page.getByText("ロールを削除しました。")).toBeVisible();
  } finally {
    await admin.context.close();
  }
});
