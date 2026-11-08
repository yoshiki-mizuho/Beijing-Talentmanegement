import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("MEMBERがロールを確認して目標を変更し元に戻せる", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("目標ロール部署");
  const account = await data.createMember({ label: "目標ロール本人", departmentId: department.id });
  // 要件のないロールは「達成」扱いで「目標にする」が出ないので、まだ持っていないスキルを要件にする
  const { skill } = await data.createSkill("目標ロール要件");
  const roleA = await data.createRole("目標ロールA", [{ skillId: skill.id, requiredLevel: 3 }]);
  const roleB = await data.createRole("目標ロールB", [{ skillId: skill.id, requiredLevel: 3 }]);
  const member = await openLoggedInContext(browser, account.credential);
  try {
    // 専用のメンバーは目標ロールが未設定なので、専用のロールAを目標にしてからBへ変える
    for (const role of [roleA, roleB]) {
      await member.page.goto(`/roles?role=${encodeURIComponent(role.id)}`);
      await member.page.getByRole("button", { name: "目標にする" }).click();
      await expect(member.page.getByText("目標ロールを更新しました。")).toBeVisible();
    }
  } finally {
    await member.context.close();
    await data.cleanup();
  }
});

test("ADMINが必要なスキルを2つ選んでロールを作成できる", async ({
  browser,
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
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
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("ロールを登録しました。")).toBeVisible();
    await data.trackCreated({ roleNames: [roleName] });

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
    await data.cleanup();
  }
});
