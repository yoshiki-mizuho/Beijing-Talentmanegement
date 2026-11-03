import { expect, test, type Locator } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("目標ロール達成を祝い、次の目標をあとで決めると再表示されない", async ({ browser }) => {
  test.slow();
  const roleName = `E2E達成ロール-${Date.now()}-${test.info().workerIndex}`;
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  let admin: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let originalTargetHref: string | null = null;

  try {
    await dismissExistingLevelUpDialogs(member.page);
    await member.page.goto("/roles");
    const originalTarget = member.page
      .getByText("目標", { exact: true })
      .first()
      .locator("xpath=ancestor::a");
    if (await originalTarget.count()) {
      originalTargetHref = await originalTarget.getAttribute("href");
    }
    await member.page.goto("/my/skills");
    const skill = await findUpgradeableSkill(
      member.page.locator('[role="group"][aria-label$="のレベル"]')
    );

    admin = await openLoggedInContext(browser, credentials.ADMIN);
    await admin.page.goto("/roles");
    await admin.page.getByRole("button", { name: "ロールを追加" }).click();
    const createDialog = admin.page.getByRole("dialog", { name: "新規ロール" });
    await createDialog.getByLabel("ロール名").fill(roleName);
    await createDialog.getByRole("button", { name: "＋ スキルを追加" }).click();
    const skillSelect = createDialog.getByLabel("必要なスキル");
    const skillValue = await skillSelect.locator("option").filter({ hasText: new RegExp(` / ${escapeRegExp(skill.name)}$`) }).getAttribute("value");
    if (!skillValue) throw new Error(`${skill.name}の選択肢がありません。`);
    await skillSelect.selectOption(skillValue);
    await createDialog.getByLabel("必要レベル").selectOption(String(skill.currentLevel + 1));
    await createDialog.getByRole("button", { name: "保存", exact: true }).click();
    await expect(admin.page.getByText("ロールを登録しました。")).toBeVisible();

    await member.page.goto("/roles");
    await member.page.getByRole("link", { name: new RegExp(roleName) }).click();
    await member.page.getByRole("button", { name: "目標にする" }).click();
    await expect(member.page.getByText("目標ロールを更新しました。")).toBeVisible();
    await member.page.goto("/my/skills");
    await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button").nth(skill.currentLevel).click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();

    const manager = await openLoggedInContext(browser, credentials.MANAGER);
    try {
      await manager.page.goto("/skill-approvals");
      const approval = manager.page.getByRole("listitem", { name: `Member User / ${skill.name}の承認` });
      await approval.getByRole("button", { name: `Member Userの${skill.name}を承認`, exact: true }).click();
      await expect(manager.page.getByText("スキル申請を承認しました。")).toBeVisible();
    } finally {
      await manager.context.close();
    }

    await member.page.goto("/dashboard");
    let dialog = member.page.getByRole("dialog");
    await expect(dialog.getByText("LEVEL UP", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "続ける", exact: true }).click();
    dialog = member.page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: `${roleName}になりました` })).toBeVisible();
    await dialog.getByRole("button", { name: "次の目標ロールを決める →" }).click();
    await expect(dialog.getByRole("heading", { name: "次はどこを目指しますか" })).toBeVisible();
    await dialog.getByRole("button", { name: "あとで決める" }).click();
    await expect(dialog).toHaveCount(0);
    await member.page.reload();
    await expect(member.page.getByRole("dialog")).toHaveCount(0);
  } finally {
    if (originalTargetHref) {
      // 元の目標ロールに戻す（ほかの E2E が MEMBER の目標ロールを前提にしているため）
      await member.page.goto(originalTargetHref);
      await member.page.getByRole("button", { name: "目標にする" }).click();
      await expect(member.page.getByText("目標ロールを更新しました。")).toBeVisible();
    }
    await member.context.close();
    if (admin) {
      await admin.page.goto("/roles");
      const roleLink = admin.page.getByRole("link", { name: new RegExp(roleName) });
      if (await roleLink.count()) {
        await roleLink.click();
        await admin.page.getByRole("button", { name: "編集" }).click();
        await admin.page.getByRole("button", { name: "削除", exact: true }).last().click();
        await admin.page.getByRole("dialog", { name: "ロールを削除しますか" }).getByRole("button", { name: "削除する" }).click();
      }
      await admin.context.close();
    }
  }
});

async function findUpgradeableSkill(groups: Locator) {
  for (let index = 0; index < await groups.count(); index += 1) {
    const group = groups.nth(index);
    const name = (await group.getAttribute("aria-label"))?.replace(/のレベル$/, "");
    if (!name) continue;
    const buttons = group.getByRole("button");
    let currentLevel = 0;
    for (let buttonIndex = 0; buttonIndex < await buttons.count(); buttonIndex += 1) {
      if (await buttons.nth(buttonIndex).isDisabled()) {
        currentLevel = -1;
        break;
      }
      if ((await buttons.nth(buttonIndex).getAttribute("aria-pressed")) === "true") currentLevel = buttonIndex + 1;
    }
    if (currentLevel >= 0 && currentLevel < 5) return { name, currentLevel };
  }
  throw new Error("申請できるスキルがありません。");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
