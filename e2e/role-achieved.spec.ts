import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("目標ロール達成を祝い、次の目標をあとで決めると再表示されない", async ({ browser }) => {
  test.slow();
  const data = createE2eTestData();
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const department = await data.createDepartment("ロール達成部署");
    const managerAccount = await data.createMember({ label: "ロール達成管理者", departmentId: department.id, role: "MANAGER" });
    const { skill } = await data.createSkill("ロール達成スキル");
    const role = await data.createRole("ロール達成目標", [{ skillId: skill.id, requiredLevel: 2 }]);
    const memberAccount = await data.createMember({ label: "ロール達成申請者", departmentId: department.id, managerId: managerAccount.member.id });
    await data.createMemberSkill({ memberId: memberAccount.member.id, skillId: skill.id, level: 1, approvedByMemberId: managerAccount.member.id });
    member = await openLoggedInContext(browser, memberAccount.credential);
    await member.page.goto("/roles");
    await member.page.getByRole("link", { name: new RegExp(role.name) }).click();
    await member.page.getByRole("button", { name: "目標にする" }).click();
    await expect(member.page.getByText("目標ロールを更新しました。")).toBeVisible();
    await member.page.goto("/my/skills");
    await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button", { name: "Lv2", exact: true }).click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();

    manager = await openLoggedInContext(browser, managerAccount.credential);
    await manager.page.goto("/skill-approvals");
    const approval = manager.page.getByRole("listitem", { name: `${memberAccount.member.name} / ${skill.name}の承認` });
    await approval.getByRole("button", { name: `${memberAccount.member.name}の${skill.name}を承認`, exact: true }).click();
    await expect(manager.page.getByText("スキル申請を承認しました。")).toBeVisible();

    await member.page.goto("/dashboard");
    let dialog = member.page.getByRole("dialog");
    await expect(dialog.getByText("LEVEL UP", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "続ける", exact: true }).click();
    dialog = member.page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: `${role.name}になりました` })).toBeVisible();
    await dialog.getByRole("button", { name: "次の目標ロールを決める →" }).click();
    await expect(dialog.getByRole("heading", { name: "次はどこを目指しますか" })).toBeVisible();
    await dialog.getByRole("button", { name: "あとで決める" }).click();
    await expect(dialog).toHaveCount(0);
    await member.page.reload();
    await expect(member.page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await manager?.context.close();
    await member?.context.close();
    await data.cleanup();
  }
});
