import { expect, test, type Locator } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("承認後のレベルアップ演出は閉じると再表示されない", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    await dismissExistingLevelUpDialogs(member.page);
    await member.page.goto("/my/skills");
    const selection = await findUpgradeableSkill(
      member.page.locator('[role="group"][aria-label$="のレベル"]')
    );
    await selection.button.click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();
    await expect(member.page.getByText("1件のスキルを申請しました。マネージャーの承認をお待ちください。")).toBeVisible();

    const manager = await openLoggedInContext(browser, credentials.MANAGER);
    try {
      await manager.page.goto("/skill-approvals");
      const approval = manager.page.getByRole("group", {
        name: `Member User / ${selection.skillName}の承認`
      });
      await expect(approval).toBeVisible();
      await approval.getByRole("button", {
        name: `Member Userの${selection.skillName}を承認`,
        exact: true
      }).click();
      await expect(manager.page.getByText("スキル申請を承認しました。")).toBeVisible();
    } finally {
      await manager.context.close();
    }

    await member.page.goto("/dashboard");
    const dialog = member.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("LEVEL UP", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    await member.page.reload();
    await expect(member.page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await member.context.close();
  }
});

async function dismissExistingLevelUpDialogs(
  page: import("@playwright/test").Page
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const dialog = page.getByRole("dialog").filter({ hasText: "LEVEL UP" });
    if ((await dialog.count()) === 0) return;

    await dialog
      .getByRole("button", { name: "ダイアログを閉じる" })
      .click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
  }
  throw new Error("既存のレベルアップ通知を10件以内に確認できませんでした。");
}

async function findUpgradeableSkill(groups: Locator) {
  for (let index = 0; index < await groups.count(); index += 1) {
    const group = groups.nth(index);
    const groupName = await group.getAttribute("aria-label");
    const skillName = groupName?.replace(/のレベル$/, "");
    if (!skillName) continue;

    const buttons = group.getByRole("button");
    let currentLevel = 0;
    for (let buttonIndex = 0; buttonIndex < await buttons.count(); buttonIndex += 1) {
      const button = buttons.nth(buttonIndex);
      if (await button.isDisabled()) {
        currentLevel = -1;
        break;
      }
      if ((await button.getAttribute("aria-pressed")) === "true") {
        currentLevel = buttonIndex + 1;
      }
    }
    if (currentLevel < 0 || currentLevel >= 5) continue;

    return { skillName, button: buttons.nth(currentLevel) };
  }
  throw new Error("承認待ちではなく、現在値より高いレベルを申請できるスキルがありません。 ");
}
