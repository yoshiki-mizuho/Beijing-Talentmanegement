import { expect, test } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

test("MANAGERの応援がMEMBERのダッシュボードに表示される", async ({ browser }) => {
  const data = createE2eTestData();
  let memberSession: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let managerSession: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const department = await data.createDepartment("応援部署");
    const { skill } = await data.createSkill("応援スキル");
    const role = await data.createRole("応援目標ロール", [{ skillId: skill.id, requiredLevel: 2 }]);
    const manager = await data.createMember({ label: "応援管理者", departmentId: department.id, role: "MANAGER" });
    const member = await data.createMember({ label: "応援部下", departmentId: department.id, managerId: manager.member.id, targetRoleId: role.id });
    await data.createMemberSkill({ memberId: member.member.id, skillId: skill.id, level: 1, approvedByMemberId: manager.member.id });

    memberSession = await openLoggedInContext(browser, member.credential);
    await dismissExistingLevelUpDialogs(memberSession.page);
    managerSession = await openLoggedInContext(browser, manager.credential);
    const cheerButton = managerSession.page.getByRole("button", {
      name: `${member.member.name}を応援する`
    });
    await expect(cheerButton).toBeVisible();
    await cheerButton.click();
    const message = `${data.prefix} 応援`;
    await managerSession.page.getByLabel("メッセージ").fill(message);
    await managerSession.page.getByRole("button", { name: "送信する" }).click();
    await expect(managerSession.page.getByText("応援を送りました")).toBeVisible();

    await memberSession.page.reload();
    const cheerDialog = memberSession.page.getByRole("dialog").filter({ hasText: "CHEER" });
    await expect(cheerDialog.getByText(message)).toBeVisible();
    await cheerDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();
    await expect(memberSession.page.getByRole("heading", { name: "応援が届いています" })).toBeVisible();
    // 文面はダッシュボードの「応援が届いています」の欄で確かめる（ほかの場所にも同じ文面が出ることがある）
    const cheersSection = memberSession.page.getByRole("region", { name: "応援が届いています" });
    await expect(cheersSection.getByText(message, { exact: true })).toBeVisible();
  } finally {
    await managerSession?.context.close();
    await memberSession?.context.close();
    await data.cleanup();
  }
});

test("MANAGERが1on1メモを追加して話した側へ移せる", async ({ browser }) => {
  const data = createE2eTestData();
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const department = await data.createDepartment("1on1部署");
    const manager = await data.createMember({ label: "1on1管理者", departmentId: department.id, role: "MANAGER" });
    const member = await data.createMember({ label: "1on1部下", departmentId: department.id, managerId: manager.member.id });
    session = await openLoggedInContext(browser, manager.credential);
    await session.page.goto("/members");
    await session.page.getByRole("button", { name: `${member.member.name}の詳細を開く` }).click();
    await session.page.getByRole("tab", { name: "1on1 メモ" }).click();
    const body = `${data.prefix} 1on1`;
    await session.page.getByLabel("メモを追加").fill(body);
    await session.page.getByRole("button", { name: "追加する" }).click();
    const item = session.page.getByRole("listitem").filter({ hasText: body });
    await expect(item).toBeVisible();
    await item.getByRole("checkbox", { name: "話した" }).click();
    await expect(item.getByText(/話した日：/)).toBeVisible();
  } finally {
    await session?.context.close();
    await data.cleanup();
  }
});
