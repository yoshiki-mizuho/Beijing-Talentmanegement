import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

async function getUnreadNotificationCount(page: import("@playwright/test").Page) {
  const label = await page.getByLabel(/通知を開く/).getAttribute("aria-label");
  const count = label?.match(/未読通知(\d+)件/)?.[1];
  return count ? Number(count) : 0;
}

test("複数のスキル申告を上司への通知1件にまとめ、承認後に既読にする", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  const admin = await openLoggedInContext(browser, credentials.ADMIN);

  try {
    const managerUnreadBefore = await getUnreadNotificationCount(manager.page);
    const adminUnreadBefore = await getUnreadNotificationCount(admin.page);

    await member.page.goto("/my/skills");
    await dismissExistingLevelUpDialogs(member.page);
    const levelGroups = member.page.locator('[role="group"][aria-label$="のレベル"]');
    const selectedSkills: string[] = [];

    for (let index = 0; index < await levelGroups.count() && selectedSkills.length < 2; index += 1) {
      const group = levelGroups.nth(index);
      const selectableLevel = group.locator('button:not(:disabled)[aria-pressed="false"]').first();
      if (await selectableLevel.count() === 0) {
        continue;
      }
      const groupName = await group.getAttribute("aria-label");
      const skillName = groupName?.replace(/のレベル$/, "");
      if (!skillName) {
        continue;
      }
      await selectableLevel.click();
      selectedSkills.push(skillName);
    }

    expect(selectedSkills).toHaveLength(2);
    await member.page.getByRole("button", { name: "2件を申請", exact: true }).click();
    await expect(
      member.page.getByText(
        "2件のスキルを申請しました。マネージャーの承認をお待ちください。"
      )
    ).toBeVisible();

    await manager.page.goto("/notifications?view=unread");
    await expect(manager.page.getByLabel(/通知を開く、未読通知/)).toHaveAttribute(
      "aria-label",
      `通知を開く、未読通知${managerUnreadBefore + 1}件`
    );
    await expect(
      manager.page.getByText("2件の申請が届きました", { exact: false })
    ).toHaveCount(1);

    await admin.page.goto("/dashboard");
    expect(await getUnreadNotificationCount(admin.page)).toBe(adminUnreadBefore);

    await manager.page.goto("/skill-approvals");
    for (const skillName of selectedSkills) {
      await manager.page.getByLabel(`Member Userの${skillName}申請を選択`).check();
    }
    await manager.page.getByRole("button", { name: "選択した 2件を承認" }).click();
    await manager.page.getByRole("button", { name: "承認する", exact: true }).click();
    await expect(manager.page.getByText("2件の申請を承認しました。"))
      .toBeVisible();

    await manager.page.goto("/dashboard");
    expect(await getUnreadNotificationCount(manager.page)).toBe(managerUnreadBefore);

    await member.page.goto("/dashboard");
    await dismissExistingLevelUpDialogs(member.page);
  } finally {
    await admin.context.close();
    await manager.context.close();
    await member.context.close();
  }
});

test("メンバーのスキル申告をマネージャーが承認できる", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    await member.page.goto("/my/skills");
    await dismissExistingLevelUpDialogs(member.page);

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
    await member.page.getByRole("tab", { name: "申請履歴" }).click();

    const pendingHistory = member.page.getByRole("group", {
      name: `${skillName}の申請履歴`
    }).first();
    await expect(pendingHistory).toContainText("承認待ち");

    const manager = await openLoggedInContext(browser, credentials.MANAGER);
    try {
      await manager.page.goto("/skill-approvals");
      const approval = manager.page.getByRole("listitem", {
        name: `Member User / ${skillName}の承認`
      });
      await expect(approval).toBeVisible();
      await approval.getByRole("button", {
        name: `Member Userの${skillName}を承認`,
        exact: true
      }).click();
      await expect(manager.page.getByText("スキル申請を承認しました。"))
        .toBeVisible();
      await expect(approval).toHaveCount(0);
    } finally {
      await manager.context.close();
    }

    await member.page.goto("/my/skills?tab=history");
    const approvedHistory = member.page.getByRole("group", {
      name: `${skillName}の申請履歴`
    }).first();
    await expect(approvedHistory).toContainText("承認済み");

    // 承認で生まれたレベルアップ演出を確認済みにして、後のテストに残さない
    await member.page.goto("/dashboard");
    await dismissExistingLevelUpDialogs(member.page);
  } finally {
    await member.context.close();
  }
});

test("差し戻し理由を入力し、メンバーが申請履歴で確認できる", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  const rejectionReason = "実務で使った例を追記してください";

  try {
    await member.page.goto("/my/skills");
    await dismissExistingLevelUpDialogs(member.page);
    const selectableLevel = member.page.locator(
      '[role="group"][aria-label$="のレベル"] button:not(:disabled)[aria-pressed="false"]'
    ).first();
    const levelGroup = selectableLevel.locator("..");
    const groupName = await levelGroup.getAttribute("aria-label");
    const skillName = groupName?.replace(/のレベル$/, "");

    if (!skillName) {
      throw new Error("申告可能なスキル名を取得できませんでした。");
    }

    await selectableLevel.click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();

    const manager = await openLoggedInContext(browser, credentials.MANAGER);
    try {
      await manager.page.goto("/skill-approvals");
      const approval = manager.page.getByRole("listitem", {
        name: `Member User / ${skillName}の承認`
      });
      await approval.getByRole("button", {
        name: `Member Userの${skillName}を差し戻し`,
        exact: true
      }).click();

      const reasonInput = manager.page.getByLabel("差し戻し理由");
      await reasonInput.click();
      // 1文字ずつ入力し、入力のたびにフォーカスが奪われないことを確かめる
      await reasonInput.pressSequentially(rejectionReason);
      await expect(reasonInput).toHaveValue(rejectionReason);
      await expect(reasonInput).toBeFocused();
      await manager.page.getByRole("button", { name: "差し戻す", exact: true }).click();
      await expect(manager.page.getByText("スキル申請を差し戻しました。"))
        .toBeVisible();
    } finally {
      await manager.context.close();
    }

    await member.page.goto("/my/skills?tab=history");
    const rejectedHistory = member.page.getByRole("group", {
      name: `${skillName}の申請履歴`
    }).first();
    await expect(rejectedHistory).toContainText("差し戻し");
    await expect(rejectedHistory).toContainText(`差し戻しの理由：${rejectionReason}`);
  } finally {
    await member.context.close();
  }
});
