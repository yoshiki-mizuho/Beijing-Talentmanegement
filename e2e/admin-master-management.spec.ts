import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("スキルごとのレベルの目安を保存してスキルシートに表示できる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const uniqueSuffix = `${Date.now()}-${test.info().workerIndex}`;
  const skillName = `E2E目安スキル-${uniqueSuffix}`;
  const levelGuide = "E2Eで設定したLv3の目安";

  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "スキルを追加", exact: true }).click();
    const createDialog = admin.page.getByRole("dialog", { name: "スキルを追加" });
    await createDialog.getByLabel("スキル名").fill(skillName);
    await createDialog.getByRole("button", { name: "スキルを追加", exact: true }).click();
    await expect(admin.page.getByText("スキルを登録しました。")).toBeVisible();

    const skillRow = admin.page.getByRole("row").filter({ hasText: skillName });
    await skillRow.getByRole("button", { name: `${skillName}を編集` }).click();
    let editDialog = admin.page.getByRole("dialog", { name: `${skillName}を編集` });
    await editDialog.getByLabel("Lv3").fill(levelGuide);
    await editDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("スキルを更新しました。")).toBeVisible();

    await skillRow.getByRole("button", { name: `${skillName}を編集` }).click();
    editDialog = admin.page.getByRole("dialog", { name: `${skillName}を編集` });
    await expect(editDialog.getByLabel("Lv3")).toHaveValue(levelGuide);
    await editDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    const member = await openLoggedInContext(browser, credentials.MEMBER);
    try {
      await member.page.goto("/my/skills");
      // 他のテストや撮影で届いた応援・レベルアップの演出が操作をふさがないよう閉じておく
      await dismissExistingLevelUpDialogs(member.page);
      await member.page.getByLabel("スキルを検索").fill(skillName);
      const skillGroup = member.page.getByRole("group", { name: `${skillName}のレベル` });
      await skillGroup.getByRole("button", { name: "Lv3" }).click();
      await expect(member.page.getByText(levelGuide)).toBeVisible();
    } finally {
      await member.context.close();
    }

    await admin.page.goto("/skills");
    await admin.page.getByLabel("スキル名").fill(skillName);
    await admin.page
      .getByRole("row")
      .filter({ hasText: skillName })
      .getByRole("button", { name: `${skillName}を編集` })
      .click();
    await admin.page
      .getByRole("dialog", { name: `${skillName}を編集` })
      .getByRole("button", { name: "スキルを削除" })
      .click();
    await admin.page
      .getByRole("dialog", { name: "スキルを削除しますか" })
      .getByRole("button", { name: "削除する" })
      .click();
    await expect(admin.page.getByText("スキルを削除しました。")).toBeVisible();
  } finally {
    await admin.context.close();
  }
});

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
    await admin.page.locator('a[href^="/roles?role="]').first().click();
    await admin.page.getByRole("button", { name: "編集" }).click();
    const roleDialog = admin.page.getByRole("dialog", { name: /を編集$/ });
    const skillSelect = roleDialog.getByLabel("スキル");
    const skillOptionValue = await skillSelect
      .locator("option")
      .filter({ hasText: editedSkillName })
      .getAttribute("value");

    if (!skillOptionValue) {
      throw new Error("作成したスキルがロール要件の候補にありません。");
    }

    await skillSelect.selectOption(skillOptionValue);
    await roleDialog
      .getByRole("button", { name: "追加", exact: true })
      .click();
    await expect(admin.page.getByText("ロール要件を設定しました。")).toBeVisible();

    // 外した後は候補の選択肢に名前が戻るので、要件の行（外すボタンを持つ行）に絞る
    const requirement = roleDialog
      .locator("div.border-b")
      .filter({ hasText: editedSkillName });
    await expect(requirement).toContainText(editedSkillName);
    await expect(
      roleDialog
        .getByLabel("スキル")
        .locator("option")
        .filter({ hasText: editedSkillName })
    ).toHaveCount(0);
    await requirement.getByRole("button", { name: "外す", exact: true }).click();
    await expect(admin.page.getByText("ロール要件を削除しました。")).toBeVisible();
    await expect(requirement).toHaveCount(0);

    await admin.page.goto("/skills");
    // 一覧の読み込みで行の位置がずれないよう、名前で1件に絞ってから操作する
    await admin.page.getByLabel("スキル名").fill(editedSkillName);
    await admin.page.getByLabel("無効を含む").check();
    const editedRow = admin.page
      .getByRole("row")
      .filter({ hasText: editedSkillName });
    await expect(admin.page.getByRole("row")).toHaveCount(2);
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

test("管理者がスキルを検索・削除し、要件付きロールも削除できる", async ({ browser }) => {
  test.setTimeout(60_000);
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const uniqueSuffix = `${Date.now()}-${test.info().workerIndex}`;
  const categoryName = `E2Eカテゴリ-${uniqueSuffix}`;
  const skillName = `E2E削除スキル-${uniqueSuffix}`;
  const roleName = `E2E削除ロール-${uniqueSuffix}`;

  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    const categoryDialog = admin.page.getByRole("dialog", { name: "カテゴリを管理" });
    await categoryDialog.getByLabel("カテゴリ名").first().fill(categoryName);
    await categoryDialog.getByRole("button", { name: "追加", exact: true }).click();
    await expect(admin.page.getByText("カテゴリを登録しました。")).toBeVisible();
    await categoryDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    await admin.page.getByRole("button", { name: "スキルを追加", exact: true }).click();
    const createSkillDialog = admin.page.getByRole("dialog", { name: "スキルを追加" });
    await createSkillDialog.getByLabel("スキル名").fill(skillName);
    await createSkillDialog.getByLabel("カテゴリ").selectOption({ label: categoryName });
    await createSkillDialog
      .getByRole("button", { name: "スキルを追加", exact: true })
      .click();
    await expect(admin.page.getByText("スキルを登録しました。")).toBeVisible();

    await admin.page.getByLabel("スキル名").fill(skillName);
    await expect(admin.page.getByRole("row").filter({ hasText: skillName })).toHaveCount(1);
    await expect(admin.page.getByRole("row")).toHaveCount(2);

    await admin.page.getByRole("row").filter({ hasText: skillName }).getByRole("button").click();
    const deleteSkillDialog = admin.page.getByRole("dialog", { name: `${skillName}を編集` });
    await deleteSkillDialog.getByRole("button", { name: "スキルを削除" }).click();
    await admin.page
      .getByRole("dialog", { name: "スキルを削除しますか" })
      .getByRole("button", { name: "削除する" })
      .click();
    await expect(admin.page.getByText("スキルを削除しました。")).toBeVisible();

    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    // カテゴリ名は入力欄の値なので hasText では探せない。入力欄と削除ボタンを両方含む最も内側の要素を行とみなす
    const categoryRow = admin.page
      .getByRole("dialog", { name: "カテゴリを管理" })
      .locator("div")
      .filter({ has: admin.page.locator(`input[value="${categoryName}"]`) })
      .filter({ has: admin.page.getByRole("button", { name: "削除", exact: true }) })
      .last();
    await categoryRow.getByRole("button", { name: "削除", exact: true }).click();
    await admin.page
      .getByRole("dialog", { name: "カテゴリを削除しますか" })
      .getByRole("button", { name: "削除する" })
      .click();
    await expect(admin.page.getByText("カテゴリを削除しました。")).toBeVisible();

    await admin.page.goto("/skills");
    const usedSkillRow = admin.page.getByRole("row").filter({ hasText: "TypeScript" });
    await usedSkillRow.getByRole("button", { name: "TypeScriptを編集" }).click();
    const usedSkillDialog = admin.page.getByRole("dialog", { name: "TypeScriptを編集" });
    await expect(usedSkillDialog.getByRole("button", { name: "スキルを削除" })).toHaveCount(0);
    await expect(usedSkillDialog.getByText(/ため削除できません。無効化してください。/)).toBeVisible();
    await usedSkillDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    await admin.page.goto("/roles");
    await admin.page.getByRole("button", { name: "ロールを追加" }).click();
    const createRoleDialog = admin.page.getByRole("dialog", { name: "新規ロール" });
    await createRoleDialog.getByLabel("ロール名").fill(roleName);
    await createRoleDialog.getByRole("button", { name: "ロールを登録" }).click();
    await expect(admin.page.getByText("ロールを登録しました。")).toBeVisible();

    await admin.page.getByRole("link", { name: new RegExp(roleName) }).click();
    await admin.page.getByRole("button", { name: "編集" }).click();
    const roleDialog = admin.page.getByRole("dialog", { name: `${roleName}を編集` });
    await roleDialog.getByRole("button", { name: "削除", exact: true }).last().click();
    const deleteRoleDialog = admin.page.getByRole("dialog", { name: "ロールを削除しますか" });
    await deleteRoleDialog.getByRole("button", { name: "削除する" }).click();
    await expect(admin.page.getByText("ロールを削除しました。")).toBeVisible();
    await expect(admin.page.getByText(roleName)).toHaveCount(0);
  } finally {
    await admin.context.close();
  }
});

test("スキル検索をクリアして一覧を元に戻せる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  try {
    await admin.page.goto("/skills");
    const searchInput = admin.page.getByLabel("スキル名");
    // 一覧が描かれる前に数えると0行が基準になるため、最初の行が出るのを待つ
    await expect(admin.page.getByRole("row").nth(1)).toBeVisible();
    const initialRows = await admin.page.getByRole("row").count();
    await searchInput.fill("TypeScript");
    await admin.page.getByRole("button", { name: "検索をクリア" }).click();

    await expect(searchInput).toHaveValue("");
    await expect(searchInput).toBeFocused();
    await expect(admin.page.getByRole("row")).toHaveCount(initialRows);
  } finally {
    await admin.context.close();
  }
});

test("ロール詳細の全社の状況を切り替えられる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  try {
    await admin.page.goto("/roles");
    await expect(admin.page.getByRole("heading", { name: "全社の状況" })).toBeVisible();
    await admin.page.getByRole("button", { name: /^達成 \d+$/ }).click();
  } finally {
    await admin.context.close();
  }
});
