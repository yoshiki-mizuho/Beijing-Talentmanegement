import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("承認後のレベルアップ演出は閉じると再表示されない", async ({ browser }) => {
  const data = createE2eTestData();
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const department = await data.createDepartment("レベルアップ部署");
    const managerAccount = await data.createMember({ label: "レベルアップ管理者", departmentId: department.id, role: "MANAGER" });
    const memberAccount = await data.createMember({ label: "レベルアップ申請者", departmentId: department.id, managerId: managerAccount.member.id });
    const { skill } = await data.createSkill("レベルアップスキル");
    await data.createMemberSkill({ memberId: memberAccount.member.id, skillId: skill.id, level: 1, approvedByMemberId: managerAccount.member.id });
    member = await openLoggedInContext(browser, memberAccount.credential);
    await member.page.goto("/my/skills");
    await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button", { name: "Lv2", exact: true }).click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();
    await expect(member.page.getByText("1件のスキルを申請しました。マネージャーの承認をお待ちください。")).toBeVisible();

    manager = await openLoggedInContext(browser, managerAccount.credential);
    await manager.page.goto("/skill-approvals");
    const approval = manager.page.getByRole("listitem", { name: `${memberAccount.member.name} / ${skill.name}の承認` });
    await expect(approval).toBeVisible();
    await approval.getByRole("button", { name: `${memberAccount.member.name}の${skill.name}を承認`, exact: true }).click();
    await expect(manager.page.getByText("スキル申請を承認しました。")).toBeVisible();

    await member.page.goto("/dashboard");
    const dialog = member.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("LEVEL UP", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    await member.page.reload();
    await expect(member.page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await manager?.context.close();
    await member?.context.close();
    await data.cleanup();
  }
});
