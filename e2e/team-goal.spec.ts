import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("マネージャーが決めたチーム目標を部下も確認できる", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("チーム目標部署");
  const manager = await data.createMember({
    label: "チーム目標マネージャー",
    departmentId: department.id,
    role: "MANAGER"
  });
  const member = await data.createMember({
    label: "チーム目標メンバー",
    departmentId: department.id,
    managerId: manager.member.id
  });
  const { skill } = await data.createSkill("チーム目標スキル");
  await data.createMemberSkill({
    memberId: member.member.id,
    skillId: skill.id,
    level: 3,
    approvedByMemberId: manager.member.id
  });
  const managerPage = await openLoggedInContext(browser, manager.credential);
  let memberPage: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;

  try {
    await managerPage.page.getByRole("button", { name: "目標を決める" }).click();
    const dialog = managerPage.page.getByRole("dialog", { name: "チーム目標" });
    await dialog.getByRole("button", { name: /レベルアップの件数/ }).click();
    await dialog.getByLabel("数", { exact: true }).fill("2");
    await dialog.getByRole("button", { name: "目標を決める", exact: true }).click();
    await expect(managerPage.page.getByText("レベルアップ 2件", { exact: true })).toBeVisible();
    await expect(managerPage.page.getByRole("progressbar", { name: "チーム目標の進み具合" })).toBeVisible();

    memberPage = await openLoggedInContext(browser, member.credential);
    await expect(memberPage.page.getByText("レベルアップ 2件", { exact: true })).toBeVisible();
  } finally {
    await managerPage.context.close();
    await memberPage?.context.close();
    await data.cleanup();
  }
});

test("達成したチーム目標をマネージャーと部下が一度ずつ確認できる", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("チーム目標達成部署");
  const manager = await data.createMember({
    label: "チーム目標達成マネージャー",
    departmentId: department.id,
    role: "MANAGER"
  });
  const member = await data.createMember({
    label: "チーム目標達成メンバー",
    departmentId: department.id,
    managerId: manager.member.id
  });
  const { skill } = await data.createSkill("チーム目標達成スキル");
  await data.createMemberSkill({
    memberId: member.member.id,
    skillId: skill.id,
    level: 3,
    approvedByMemberId: manager.member.id
  });
  const managerPage = await openLoggedInContext(browser, manager.credential);
  let memberPage: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;

  try {
    await managerPage.page.getByRole("button", { name: "目標を決める" }).click();
    const goalDialog = managerPage.page.getByRole("dialog", { name: "チーム目標" });
    await goalDialog.getByRole("button", { name: /スキルの到達人数/ }).click();
    await goalDialog.getByLabel("スキル", { exact: true }).fill(skill.name);
    await goalDialog.getByRole("option", { name: skill.name }).click();
    await goalDialog.getByLabel("レベル", { exact: true }).selectOption("3");
    await goalDialog.getByLabel("数", { exact: true }).fill("1");
    await goalDialog.getByRole("button", { name: "目標を決める", exact: true }).click();

    const managerCelebration = managerPage.page.getByRole("dialog", {
      name: "チーム目標を達成しました"
    });
    await expect(managerCelebration).toBeVisible();
    await managerCelebration.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(managerCelebration).toBeHidden();
    await managerPage.page.reload();
    await expect(managerPage.page.getByRole("dialog", { name: "チーム目標を達成しました" })).toHaveCount(0);

    memberPage = await openLoggedInContext(browser, member.credential);
    const memberCelebration = memberPage.page.getByRole("dialog", {
      name: "チーム目標を達成しました"
    });
    await expect(memberCelebration).toBeVisible();
    await memberCelebration.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(memberCelebration).toBeHidden();
    await memberPage.page.reload();
    await expect(memberPage.page.getByRole("dialog", { name: "チーム目標を達成しました" })).toHaveCount(0);
  } finally {
    await managerPage.context.close();
    await memberPage?.context.close();
    await data.cleanup();
  }
});
