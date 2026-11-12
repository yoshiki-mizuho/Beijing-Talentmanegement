import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

async function setup(label: string) {
  const data = createE2eTestData();
  const department = await data.createDepartment(`${label}部署`);
  const manager = await data.createMember({ label: `${label}管理者`, departmentId: department.id, role: "MANAGER" });
  const member = await data.createMember({ label: `${label}申請者`, departmentId: department.id, managerId: manager.member.id });
  // スキルが1件もないと初回用のスキルシートになるので、承認済みのスキルを1つ持たせて普段のスキルシートにする
  const { skill: baseSkill } = await data.createSkill(`${label}保有スキル`);
  await data.createMemberSkill({ memberId: member.member.id, skillId: baseSkill.id, level: 2, approvedByMemberId: manager.member.id });
  return { data, manager, member };
}

async function unreadCount(page: import("@playwright/test").Page) {
  const label = await page.getByLabel(/通知を開く/).getAttribute("aria-label");
  return Number(label?.match(/未読通知(\d+)件/)?.[1] ?? 0);
}

test("スキルシートの未送信の選択を画面移動と再読み込み後も保つ", async ({ browser }) => {
  const fixture = await setup("下書き");
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const { skill } = await fixture.data.createSkill("下書きスキル");
    member = await openLoggedInContext(browser, fixture.member.credential);
    await member.page.goto("/my/skills");
    const levels = member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`);
    await levels.getByRole("button", { name: "Lv1", exact: true }).click();
    await member.page.goto("/dashboard");
    await member.page.goto("/my/skills");
    await expect(levels.getByRole("button", { name: "Lv1", exact: true })).toHaveAttribute("aria-pressed", "true");
    await member.page.reload();
    await expect(levels.getByRole("button", { name: "Lv1", exact: true })).toHaveAttribute("aria-pressed", "true");
  } finally {
    await member?.context.close();
    await fixture.data.cleanup();
  }
});

test("複数のスキル申告を上司への通知1件にまとめ、承認後に既読にする", async ({ browser }) => {
  const fixture = await setup("一括申請");
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let admin: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const adminAccount = await fixture.data.createMember({ label: "一括申請管理者外", departmentId: fixture.member.member.departmentId, role: "ADMIN" });
    const skills = await Promise.all([fixture.data.createSkill("一括申請スキルA"), fixture.data.createSkill("一括申請スキルB")]);
    member = await openLoggedInContext(browser, fixture.member.credential);
    manager = await openLoggedInContext(browser, fixture.manager.credential);
    admin = await openLoggedInContext(browser, adminAccount.credential);
    const managerBefore = await unreadCount(manager.page);
    const adminBefore = await unreadCount(admin.page);
    await member.page.goto("/my/skills");
    for (const { skill } of skills) {
      await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button", { name: "Lv1", exact: true }).click();
    }
    await member.page.getByRole("button", { name: "2件を申請", exact: true }).click();
    await expect(member.page.getByText("2件のスキルを申請しました。マネージャーの承認をお待ちください。")).toBeVisible();
    await manager.page.goto("/notifications?view=unread");
    expect(await unreadCount(manager.page)).toBe(managerBefore + 1);
    await expect(manager.page.getByText("2件の申請が届きました", { exact: false })).toHaveCount(1);
    await admin.page.goto("/dashboard");
    expect(await unreadCount(admin.page)).toBe(adminBefore);
    await manager.page.goto("/skill-approvals");
    for (const { skill } of skills) await manager.page.getByLabel(`${fixture.member.member.name}の${skill.name}申請を選択`).check();
    await manager.page.getByRole("button", { name: "選択した 2件を承認" }).click();
    await manager.page.getByRole("button", { name: "承認する", exact: true }).click();
    await expect(manager.page.getByText("2件の申請を承認しました。")).toBeVisible();
    await manager.page.goto("/dashboard");
    expect(await unreadCount(manager.page)).toBe(managerBefore);
  } finally {
    await admin?.context.close();
    await manager?.context.close();
    await member?.context.close();
    await fixture.data.cleanup();
  }
});

test("メンバーのスキル申告をマネージャーが承認できる", async ({ browser }) => {
  const fixture = await setup("承認");
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  const comment = "案件Xで設計から担当しました";
  try {
    const { skill } = await fixture.data.createSkill("承認スキル");
    member = await openLoggedInContext(browser, fixture.member.credential);
    await member.page.goto("/my/skills");
    await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button", { name: "Lv1", exact: true }).click();
    await member.page.getByLabel("ひとこと（任意）").fill(comment);
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();
    await expect(member.page.getByText("1件のスキルを申請しました。マネージャーの承認をお待ちください。")).toBeVisible();
    await member.page.getByRole("tab", { name: "申請履歴" }).click();
    const history = member.page.getByRole("group", { name: `${skill.name}の申請履歴` }).first();
    await expect(history).toContainText("承認待ち");
    await expect(history).toContainText(`ひとこと：${comment}`);
    manager = await openLoggedInContext(browser, fixture.manager.credential);
    await manager.page.goto("/skill-approvals");
    const approval = manager.page.getByRole("listitem", { name: `${fixture.member.member.name} / ${skill.name}の承認` });
    await approval.getByRole("button", { name: `${fixture.member.member.name}の${skill.name}を承認`, exact: true }).click();
    await expect(manager.page.getByText("スキル申請を承認しました。")).toBeVisible();
    await expect(approval).toHaveCount(0);
    await member.page.goto("/my/skills?tab=history");
    await expect(member.page.getByRole("group", { name: `${skill.name}の申請履歴` }).first()).toContainText("承認済み");
  } finally {
    await manager?.context.close();
    await member?.context.close();
    await fixture.data.cleanup();
  }
});

test("差し戻し理由を入力し、メンバーが申請履歴で確認できる", async ({ browser }) => {
  const fixture = await setup("差し戻し");
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  const reason = "実務で使った例を追記してください";
  try {
    const { skill } = await fixture.data.createSkill("差し戻しスキル");
    member = await openLoggedInContext(browser, fixture.member.credential);
    await member.page.goto("/my/skills");
    await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button", { name: "Lv1", exact: true }).click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();
    await expect(member.page.getByText("1件のスキルを申請しました。マネージャーの承認をお待ちください。")).toBeVisible();
    manager = await openLoggedInContext(browser, fixture.manager.credential);
    await manager.page.goto("/skill-approvals");
    const approval = manager.page.getByRole("listitem", { name: `${fixture.member.member.name} / ${skill.name}の承認` });
    await approval.getByRole("button", { name: `${fixture.member.member.name}の${skill.name}を差し戻し`, exact: true }).click();
    const input = manager.page.getByLabel("差し戻し理由");
    await input.pressSequentially(reason);
    await expect(input).toHaveValue(reason);
    await expect(input).toBeFocused();
    await manager.page.getByRole("button", { name: "差し戻す", exact: true }).click();
    await expect(manager.page.getByText("スキル申請を差し戻しました。")).toBeVisible();
    await member.page.goto("/my/skills?tab=history");
    const history = member.page.getByRole("group", { name: `${skill.name}の申請履歴` }).first();
    await expect(history).toContainText("差し戻し");
    await expect(history).toContainText(`差し戻しの理由：${reason}`);
  } finally {
    await manager?.context.close();
    await member?.context.close();
    await fixture.data.cleanup();
  }
});

test("確認ポイントの詳細を確認し、確認ポイントなしだけを選べる", async ({ browser }) => {
  const fixture = await setup("確認ポイント");
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const { skill } = await fixture.data.createSkill("確認ポイントスキル");
    await fixture.data.createMemberSkill({ memberId: fixture.member.member.id, skillId: skill.id, level: 1, approvedByMemberId: fixture.manager.member.id });
    member = await openLoggedInContext(browser, fixture.member.credential);
    await member.page.goto("/my/skills");
    await member.page.locator(`[role="group"][aria-label="${skill.name}のレベル"]`).getByRole("button", { name: "Lv3", exact: true }).click();
    await member.page.getByRole("button", { name: "1件を申請", exact: true }).click();
    manager = await openLoggedInContext(browser, fixture.manager.credential);
    await manager.page.goto("/skill-approvals");
    const approval = manager.page.getByRole("listitem", { name: `${fixture.member.member.name} / ${skill.name}の承認` });
    await expect(approval.getByText("2段以上の上昇", { exact: true })).toBeVisible();
    await approval.getByRole("button", { name: `${fixture.member.member.name}さんの ${skill.name} の詳しい内容` }).click();
    await expect(approval.getByText(/段の上昇です。/)).toBeVisible();
    await manager.page.getByRole("button", { name: "確認ポイントなしをすべて選ぶ" }).click();
    await expect(approval.getByRole("checkbox", { name: `${fixture.member.member.name}の${skill.name}申請を選択` })).not.toBeChecked();
  } finally {
    await manager?.context.close();
    await member?.context.close();
    await fixture.data.cleanup();
  }
});
