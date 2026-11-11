import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("キーボードでスキルを別カテゴリへ並び替えられる", async ({ browser }) => {
  test.slow();
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const sourceCategory = `E2E並替元-${suffix}`;
  const targetCategory = `E2E並替先-${suffix}`;
  const skillName = `E2E並替スキル-${suffix}`;

  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    const categoryDialog = admin.page.getByRole("dialog", { name: "カテゴリを管理" });
    for (const name of [sourceCategory, targetCategory]) {
      await categoryDialog.getByLabel("カテゴリ名").first().fill(name);
      await categoryDialog.getByRole("button", { name: "追加", exact: true }).click();
      // 登録済みのカテゴリは名前を編集できる入力欄として並ぶので、その欄が現れるまで待つ
      await expect(categoryDialog.locator(`input[value="${name}"]`)).toHaveCount(1);
    }
    await data.trackCreated({ categoryNames: [sourceCategory, targetCategory] });
    await categoryDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();
    for (const name of [sourceCategory, targetCategory]) {
      await expect(admin.page.getByRole("button", { name, exact: true })).toBeVisible();
    }

    await admin.page.getByRole("button", { name: "スキルを追加", exact: true }).click();
    const createDialog = admin.page.getByRole("dialog", { name: "スキルを追加" });
    await createDialog.getByLabel("スキル名").fill(skillName);
    await createDialog.getByLabel("カテゴリ").selectOption({ label: sourceCategory });
    await createDialog.getByRole("button", { name: "スキルを追加", exact: true }).click();
    await expect(admin.page.getByText("スキルを登録しました。")).toBeVisible();
    await data.trackCreated({ skillNames: [skillName] });

    const handle = admin.page.getByRole("button", { name: `${skillName}を並び替える` });
    await admin.page.getByLabel("スキル名").fill(skillName);
    await expect(handle).toBeDisabled();
    await admin.page.getByRole("button", { name: "検索をクリア" }).click();
    await handle.focus();
    await admin.page.keyboard.press("Space");
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await admin.page.keyboard.press("ArrowDown");
      const targetCard = admin.page.locator("section").filter({ hasText: targetCategory });
      if (await targetCard.getByText(skillName, { exact: true }).count()) break;
    }
    await admin.page.keyboard.press("Space");
    await expect(admin.page.getByText("並び順を保存しました")).toBeVisible();

    await admin.page.reload();
    await admin.page.getByLabel("スキル名").fill(skillName);
    // 一覧はカテゴリごとのまとまりで、行にはカテゴリ名が出ないため、移動先のまとまりの中にあることを確かめる
    const targetSection = admin.page
      .locator("section")
      .filter({ hasText: targetCategory })
      .filter({ hasNotText: sourceCategory });
    await expect(targetSection.getByRole("row").filter({ hasText: skillName })).toBeVisible();

    await admin.page.getByRole("row").filter({ hasText: skillName })
      .getByRole("button", { name: `${skillName}を編集` }).click();
    await admin.page.getByRole("dialog", { name: `${skillName}を編集` })
      .getByRole("button", { name: "スキルを削除" }).click();
    await admin.page.getByRole("dialog", { name: "スキルを削除しますか" })
      .getByRole("button", { name: "削除する" }).click();
    await expect(admin.page.getByText("スキルを削除しました。")).toBeVisible();

    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    const cleanupDialog = admin.page.getByRole("dialog", { name: "カテゴリを管理" });
    for (const name of [sourceCategory, targetCategory]) {
      // カテゴリ名は入力欄の値なので、入力欄と削除ボタンを両方含む最も内側の要素を行とみなす
      const row = cleanupDialog.locator("div")
        .filter({ has: admin.page.locator(`input[value="${name}"]`) })
        .filter({ has: admin.page.getByRole("button", { name: "削除", exact: true }) })
        .last();
      await row.getByRole("button", { name: "削除", exact: true }).click();
      await admin.page.getByRole("dialog", { name: "カテゴリを削除しますか" })
        .getByRole("button", { name: "削除する" }).click();
      await expect(cleanupDialog.locator(`input[value="${name}"]`)).toHaveCount(0);
    }
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});

test("スキルごとのレベルの目安を保存してスキルシートに表示できる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
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
    await data.trackCreated({ skillNames: [skillName] });

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
    await data.cleanup();
  }
});

test("共通のレベルの目安を編集して元に戻せる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const changedGuide = `E2E共通目安-${Date.now()}-${test.info().workerIndex}`;

  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "レベルの目安（共通）" }).click();
    let dialog = admin.page.getByRole("dialog", { name: "レベルの目安（共通）" });
    const originalGuide = await dialog.getByLabel("Lv1").inputValue();

    await dialog.getByLabel("Lv1").fill(changedGuide);
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("レベルの目安を更新しました")).toBeVisible();

    await admin.page.getByRole("button", { name: "レベルの目安（共通）" }).click();
    dialog = admin.page.getByRole("dialog", { name: "レベルの目安（共通）" });
    await expect(dialog.getByLabel("Lv1")).toHaveValue(changedGuide);

    await dialog.getByLabel("Lv1").fill(originalGuide);
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("レベルの目安を更新しました")).toBeVisible();
  } finally {
    await admin.context.close();
  }
});

test("管理者がスキルを作成・編集・無効化し、ロール要件を追加・削除できる", async ({
  browser
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
  const role = await data.createRole("スキル編集確認ロール", []);
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
    await data.trackCreated({ skillNames: [skillName] });

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
    await admin.page.getByRole("link", { name: new RegExp(role.name) }).click();
    await admin.page.getByRole("button", { name: "編集" }).click();
    const roleDialog = admin.page.getByRole("dialog", { name: /を編集$/ });
    await roleDialog.getByRole("button", { name: "＋ スキルを追加" }).click();
    const skillSelect = roleDialog.getByLabel("必要なスキル").last();
    const skillOptionValue = await skillSelect
      .locator("option")
      .filter({ hasText: editedSkillName })
      .getAttribute("value");

    if (!skillOptionValue) {
      throw new Error("作成したスキルがロール要件の候補にありません。");
    }

    await skillSelect.selectOption(skillOptionValue);
    await roleDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("ロールを更新しました。")).toBeVisible();

    await roleDialog.getByRole("button", { name: "＋ いずれかの組を追加" }).click();
    const groupSelects = roleDialog.getByLabel("必要なスキル");
    const groupSelectCount = await groupSelects.count();
    for (let index = groupSelectCount - 2; index < groupSelectCount; index += 1) {
      const value = await groupSelects.nth(index).locator("option:not([value=''])").first().getAttribute("value");
      if (!value) throw new Error("いずれかの組の候補がありません。");
      await groupSelects.nth(index).selectOption(value);
    }
    await roleDialog.getByRole("button", { name: "＋ 候補を追加" }).click();
    await expect(roleDialog.getByLabel("必要なスキル")).toHaveCount(groupSelectCount + 1);
    await roleDialog.getByRole("button", { name: "この行を外す" }).click();
    await roleDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("いずれか1つ").first()).toBeVisible();

    await roleDialog.getByRole("button", { name: "この組を外す" }).click();

    await roleDialog
      .getByRole("button", { name: `${editedSkillName}を外す` })
      .click();
    await roleDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("ロールを更新しました。").last()).toBeVisible();

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
    await data.cleanup();
  }
});

test("管理者がスキルを検索・削除し、要件付きロールも削除できる", async ({ browser }) => {
  test.setTimeout(60_000);
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
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
    await data.trackCreated({ categoryNames: [categoryName] });
    await categoryDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    await admin.page.getByRole("button", { name: "スキルを追加", exact: true }).click();
    const createSkillDialog = admin.page.getByRole("dialog", { name: "スキルを追加" });
    await createSkillDialog.getByLabel("スキル名").fill(skillName);
    await createSkillDialog.getByLabel("カテゴリ").selectOption({ label: categoryName });
    await createSkillDialog
      .getByRole("button", { name: "スキルを追加", exact: true })
      .click();
    await expect(admin.page.getByText("スキルを登録しました。")).toBeVisible();
    await data.trackCreated({ skillNames: [skillName] });

    await admin.page.getByLabel("スキル名").fill(skillName);
    await expect(admin.page.getByRole("row").filter({ hasText: skillName })).toHaveCount(1);
    await expect(admin.page.getByRole("row")).toHaveCount(2);

    await admin.page.getByRole("row").filter({ hasText: skillName }).getByRole("button", { name: `${skillName}を編集` }).click();
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
    let createRoleDialog = admin.page.getByRole("dialog", { name: "新規ロール" });
    await createRoleDialog.getByRole("button", { name: "＋ スキルを追加" }).click();
    await expect(createRoleDialog.getByLabel("必要なスキル")).toHaveCount(1);
    await createRoleDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();
    await admin.page.getByRole("button", { name: "ロールを追加" }).click();
    createRoleDialog = admin.page.getByRole("dialog", { name: "新規ロール" });
    await expect(createRoleDialog.getByLabel("必要なスキル")).toHaveCount(0);
    await createRoleDialog.getByLabel("ロール名").fill(roleName);
    await createRoleDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("ロールを登録しました。")).toBeVisible();
    await data.trackCreated({ roleNames: [roleName] });

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
    await data.cleanup();
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

test("大分類を作成してカテゴリを割り当て、削除すると未分類に戻る", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const groupName = `E2E大分類-${suffix}`;
  // デモのカテゴリの割り当てを変えないよう、使い捨てのカテゴリで確かめる（後片付けで消える）
  const categoryName = `E2E大分類用-${suffix}`;
  const skillName = `E2E大分類スキル-${suffix}`;
  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    const categoryDialog = admin.page.getByRole("dialog", { name: "カテゴリを管理" });
    await categoryDialog.getByLabel("カテゴリ名").first().fill(categoryName);
    await categoryDialog.getByRole("button", { name: "追加", exact: true }).click();
    await expect(admin.page.getByText("カテゴリを登録しました。")).toBeVisible();
    await data.trackCreated({ categoryNames: [categoryName] });
    await categoryDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();
    // スキルのない大分類はスキルシートに出ないため、使い捨てのスキルも1件作る
    await admin.page.getByRole("button", { name: categoryName, exact: true }).waitFor();
    await admin.page.getByRole("button", { name: "スキルを追加", exact: true }).click();
    const createDialog = admin.page.getByRole("dialog", { name: "スキルを追加" });
    await createDialog.getByLabel("スキル名").fill(skillName);
    await createDialog.getByLabel("カテゴリ").selectOption({ label: categoryName });
    await createDialog.getByRole("button", { name: "スキルを追加", exact: true }).click();
    await expect(admin.page.getByText("スキルを登録しました。")).toBeVisible();
    await data.trackCreated({ skillNames: [skillName] });

    await admin.page.goto("/skills?tab=groups");
    await admin.page.getByLabel("新しい大分類").fill(groupName);
    await admin.page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(admin.page.getByText("大分類を追加しました。")).toBeVisible();

    const categorySelect = admin.page.getByLabel(`${categoryName}の大分類`);
    await categorySelect.selectOption({ label: groupName });
    await expect(admin.page.getByText("カテゴリの大分類を保存しました。")).toBeVisible();
    await admin.page.reload();
    await admin.page.getByLabel(`${categoryName}の大分類`).waitFor();

    const member = await openLoggedInContext(browser, credentials.MEMBER);
    try {
      await member.page.goto("/my/skills");
      await dismissExistingLevelUpDialogs(member.page);
      await expect(member.page.getByRole("tab", { name: new RegExp(groupName) })).toBeVisible();
    } finally {
      await member.context.close();
    }

    await admin.page.getByRole("button", { name: `${groupName}を削除` }).click();
    await admin.page.getByRole("dialog", { name: "大分類を削除しますか" })
      .getByRole("button", { name: "削除する" }).click();
    await expect(admin.page.getByText("大分類を削除しました。カテゴリは未分類に戻りました。")).toBeVisible();
    await admin.page.reload();
    await expect(admin.page.getByLabel(`${categoryName}の大分類`)).toHaveValue("unclassified");
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});

test("未分類のカテゴリを絞り込んで大分類を一括で割り当てられる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const groupName = `E2E一括大分類-${suffix}`;
  const categoryNames = [
    `E2E一括カテゴリA-${suffix}`,
    `E2E一括カテゴリB-${suffix}`,
  ];
  try {
    await admin.page.goto("/skills");
    await admin.page.getByRole("button", { name: "カテゴリを管理" }).click();
    const categoryDialog = admin.page.getByRole("dialog", { name: "カテゴリを管理" });
    for (const categoryName of categoryNames) {
      await categoryDialog.getByLabel("カテゴリ名").first().fill(categoryName);
      await categoryDialog.getByRole("button", { name: "追加", exact: true }).click();
      await expect(admin.page.getByText("カテゴリを登録しました。")).toBeVisible();
      // 1件目のトーストを2件目の完了と見間違えないよう、一覧に出るまで待つ
      await expect(categoryDialog.locator(`input[value="${categoryName}"]`)).toHaveCount(1);
      await data.trackCreated({ categoryNames: [categoryName] });
    }
    await categoryDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    await admin.page.goto("/skills?tab=groups");
    await admin.page.getByLabel("新しい大分類").fill(groupName);
    await admin.page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(admin.page.getByText("大分類を追加しました。")).toBeVisible();

    await admin.page.getByRole("button", { name: /未分類のみ \d+/ }).click();
    for (const categoryName of categoryNames) {
      await admin.page.getByLabel(`${categoryName}を選択`).check();
    }
    await admin.page.getByLabel("まとめて割り当てる大分類").selectOption({ label: groupName });
    await admin.page.getByRole("button", { name: "割り当てる", exact: true }).click();
    await expect(admin.page.getByText("2件のカテゴリの大分類を保存しました。")).toBeVisible();

    await admin.page.reload();
    for (const categoryName of categoryNames) {
      await expect(
        admin.page.getByLabel(`${categoryName}の大分類`).locator("option:checked")
      ).toHaveText(groupName);
    }

    await admin.page.getByRole("button", { name: `${groupName}を削除` }).click();
    await admin.page.getByRole("dialog", { name: "大分類を削除しますか" })
      .getByRole("button", { name: "削除する" }).click();
    await expect(admin.page.getByText("大分類を削除しました。カテゴリは未分類に戻りました。")).toBeVisible();
  } finally {
    await admin.context.close();
    await data.cleanup();
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
