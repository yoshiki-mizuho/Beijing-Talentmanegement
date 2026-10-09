import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("メンバーのスキル申告をマネージャーが承認できる", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    await member.page.goto("/my/skills");

    const selectableLevel = member.page.locator(
      '[role="group"][aria-label$="のレベル"] button:not(:disabled)[aria-pressed="false"]'
    ).first();
    await expect(selectableLevel).toBeVisible();
    const levelGroup = selectableLevel.locator("..");
    const groupName = await levelGroup.getAttribute("aria-label");
    const skillName = groupName?.replace(/のレベル$/, "");

    if (!skillName) {
      throw new Error("申告可能なスキル名を取得できませんでした。");
    }

    await selectableLevel.click();
    await expect(
      member.page.getByText("1件のスキルを変更しています", { exact: true })
    ).toBeVisible();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();
    await expect(
      member.page.getByText(
        "1件のスキルを申請しました。マネージャーの承認をお待ちください。"
      )
    ).toBeVisible();

    const pendingHistory = member.page.getByRole("group", {
      name: `${skillName}の申告履歴`
    }).first();
    await expect(pendingHistory).toContainText("承認待ち");

    const manager = await openLoggedInContext(browser, credentials.MANAGER);
    try {
      await manager.page.goto("/skill-approvals");
      const approval = manager.page.getByRole("group", {
        name: `Member User / ${skillName}の承認`
      });
      await expect(approval).toBeVisible();
      await approval.getByRole("button", { name: "承認", exact: true }).click();
      await expect(manager.page.getByText("スキル申請を承認しました。"))
        .toBeVisible();
      await expect(approval).toHaveCount(0);
    } finally {
      await manager.context.close();
    }

    await member.page.reload();
    const approvedHistory = member.page.getByRole("group", {
      name: `${skillName}の申告履歴`
    }).first();
    await expect(approvedHistory).toContainText("承認済み");
  } finally {
    await member.context.close();
  }
});
