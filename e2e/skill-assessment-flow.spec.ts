import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("メンバーのスキル申告をマネージャーが承認できる", async ({ browser }) => {
  const member = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    await member.page.goto("/my/skills");

    const skillSelect = member.page.getByLabel("追加するスキル");
    await expect(skillSelect).toBeEnabled();
    await skillSelect.selectOption({ index: 0 });
    const selectedOptionText = await skillSelect.evaluate(
      (element: HTMLSelectElement) => element.selectedOptions[0]?.textContent?.trim() ?? ""
    );
    const skillName = selectedOptionText.split(" / ").at(-1)?.trim();

    if (!skillName) {
      throw new Error("申告可能なスキル名を取得できませんでした。");
    }

    await member.page.getByRole("button", { name: "追加", exact: true }).click();
    const application = member.page.getByRole("group", {
      name: `${skillName}の申請内容`
    });
    const level = application.getByRole("slider", { name: "申告レベル" });
    await level.fill("2");
    await expect(level).toHaveValue("2");
    await member.page.getByRole("button", { name: "一括申請", exact: true }).click();
    // 申請成功後はフォームが再マウントされ成功メッセージが消えるため、申告履歴で結果を確認する。

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
