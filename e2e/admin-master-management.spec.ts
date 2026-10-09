import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者がスキルを作成・編集・無効化し、ロール要件を追加・削除できる", async ({
  browser
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const uniqueSuffix = `${Date.now()}-${test.info().workerIndex}`;
  const skillName = `E2Eスキル-${uniqueSuffix}`;
  const editedSkillName = `${skillName}-編集済み`;

  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "スキルを追加", exact: true }).click();

    const createDialog = admin.page.getByRole("dialog", { name: "スキルを追加" });
    await createDialog.getByLabel("スキル名").fill(skillName);
    await createDialog.getByLabel("説明").fill("管理画面E2Eで作成したスキル");
    await createDialog
      .getByRole("button", { name: "スキルを追加", exact: true })
      .click();
    await expect(admin.page.getByText("スキルを登録しました。")).toBeVisible();

    const createdRow = admin.page.getByRole("row").filter({ hasText: skillName });
    await expect(createdRow).toBeVisible();
    await createdRow
      .getByRole("button", { name: `${skillName}を編集` })
      .click();

    const editDialog = admin.page.getByRole("dialog", {
      name: `${skillName}を編集`
    });
    await editDialog.getByLabel("スキル名").fill(editedSkillName);
    await editDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("スキルを更新しました。")).toBeVisible();
    await expect(
      admin.page.getByRole("row").filter({ hasText: editedSkillName })
    ).toBeVisible();

    await admin.page.goto("/roles");
    const editRoleButton = admin.page
      .getByRole("button", { name: /の編集を開く$/ })
      .first();
    const editRoleLabel = await editRoleButton.getAttribute("aria-label");
    const roleName = editRoleLabel?.replace(/の編集を開く$/, "");

    if (!roleName) {
      throw new Error("編集対象のロール名を取得できませんでした。");
    }

    await editRoleButton.click();
    const roleDialog = admin.page.getByRole("dialog", { name: roleName });
    const skillSelect = roleDialog.getByLabel("追加するスキル");
    const skillOptionValue = await skillSelect
      .locator("option")
      .filter({ hasText: editedSkillName })
      .getAttribute("value");

    if (!skillOptionValue) {
      throw new Error("作成したスキルがロール要件の候補にありません。");
    }

    await skillSelect.selectOption(skillOptionValue);
    await roleDialog.getByLabel("区分").selectOption("false");
    await roleDialog
      .getByRole("button", { name: "要件を追加", exact: true })
      .click();
    await expect(admin.page.getByText("ロール要件を設定しました。")).toBeVisible();

    const requirement = roleDialog.getByRole("group", {
      name: `${editedSkillName}のロール要件`
    });
    await expect(requirement).toContainText("任意");
    await expect(
      roleDialog
        .getByLabel("追加するスキル")
        .locator("option")
        .filter({ hasText: editedSkillName })
    ).toHaveCount(0);
    await requirement.getByRole("button", { name: "削除", exact: true }).click();

    const deleteDialog = admin.page.getByRole("dialog", {
      name: "ロール要件を削除しますか"
    });
    await deleteDialog
      .getByRole("button", { name: "削除する", exact: true })
      .click();
    await expect(admin.page.getByText("ロール要件を削除しました。")).toBeVisible();
    await expect(requirement).toHaveCount(0);

    await admin.page.goto("/skills");
    const editedRow = admin.page
      .getByRole("row")
      .filter({ hasText: editedSkillName });
    await editedRow
      .getByRole("button", { name: `${editedSkillName}を編集` })
      .click();

    const finalEditDialog = admin.page.getByRole("dialog", {
      name: `${editedSkillName}を編集`
    });
    await finalEditDialog
      .getByRole("button", { name: "スキルを無効化", exact: true })
      .click();
    const deactivateDialog = admin.page.getByRole("dialog", {
      name: "スキルを無効化しますか"
    });
    await deactivateDialog
      .getByRole("button", { name: "無効化する", exact: true })
      .click();
    await expect(admin.page.getByText("スキルを無効化しました。")).toBeVisible();
    await expect(editedRow).toContainText("無効");
  } finally {
    await admin.context.close();
  }
});
