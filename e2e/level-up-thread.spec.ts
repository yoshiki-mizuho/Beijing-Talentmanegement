import { expect, test } from "@playwright/test";

import { prisma } from "../src/server/db/prisma";
import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("レベルアップのリアクション、コメント、返信を通知から確認できる", async ({ browser }) => {
  test.setTimeout(120_000);
  const data = createE2eTestData();
  const comment = `${data.prefix} おめでとう`;
  const reply = `${data.prefix} ありがとう`;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let member: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let admin: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const department = await data.createDepartment("スレッド部署");
    const managerAccount = await data.createMember({ label: "スレッド管理者", departmentId: department.id, role: "MANAGER" });
    const memberAccount = await data.createMember({ label: "スレッド本人", departmentId: department.id, managerId: managerAccount.member.id });
    const adminAccount = await data.createMember({ label: "スレッド管理者外", departmentId: department.id, role: "ADMIN" });
    const { skill } = await data.createSkill("スレッドスキル");
    await data.createMemberSkill({ memberId: memberAccount.member.id, skillId: skill.id, level: 2, approvedByMemberId: managerAccount.member.id });
    const levelChange = await data.createLevelChange({ memberId: memberAccount.member.id, skillId: skill.id, fromLevel: 1, toLevel: 2, changedByMemberId: managerAccount.member.id });
    manager = await openLoggedInContext(browser, managerAccount.credential);
    member = await openLoggedInContext(browser, memberAccount.credential);
    admin = await openLoggedInContext(browser, adminAccount.credential);
    await member.page.goto("/dashboard?view=personal");
    const detailLink = member.page.locator('#growth-timeline a[href^="/level-ups/"]').first();
    await expect(detailLink).toBeVisible();
    const href = await detailLink.getAttribute("href");
    const levelChangeId = href?.split("/").pop() ?? null;
    expect(levelChangeId).toBe(levelChange.id);
    if (!href || !levelChangeId) throw new Error("レベルアップ詳細のURLを取得できませんでした。");

    await manager.page.goto(href);
    const reaction = manager.page.getByRole("button", { name: /おめでとう \d+件/ });
    if (await reaction.getAttribute("aria-pressed") === "true") await reaction.click();
    await reaction.click();
    await manager.page.getByPlaceholder("お祝いのコメントを書く").fill(comment);
    await manager.page.getByRole("button", { name: "投稿", exact: true }).click();

    await member.page.goto("/notifications?view=unread");
    await member.page
      .getByRole("main")
      .locator("form")
      .filter({ hasText: "レベルアップにリアクションが届きました" })
      .first()
      .getByRole("button", { name: "確認", exact: true })
      .click();
    await expect(member.page).toHaveURL(new RegExp(`/level-ups/${levelChangeId}$`));
    await expect(member.page.getByText(comment, { exact: true })).toBeVisible();
    await expect(member.page.getByText(/おめでとう：.+さん/)).toBeVisible();

    await admin.page.goto(href);
    const secondReaction = admin.page.getByRole("button", { name: /すごい \d+件/ });
    if (await secondReaction.getAttribute("aria-pressed") === "true") await secondReaction.click();
    await secondReaction.click();
    await expect(secondReaction).toHaveAttribute("aria-pressed", "true");
    // 2人目のリアクションでも通知は1件のまま、未読に戻る（サーバーの処理を待ってから確かめる）
    await expect(async () => {
      const notifications = await prisma.notification.findMany({
        where: { skillLevelChangeId: levelChangeId, type: "LEVEL_UP_REACTED" },
        select: { status: true, body: true }
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.status).toBe("UNREAD");
      expect(notifications[0]?.body).toMatch(/ほか 1人が/);
    }).toPass({ timeout: 20_000 });
    await member.page.goto("/notifications?view=unread");
    await expect(
      member.page.getByRole("main").getByText("レベルアップにリアクションが届きました", { exact: true }).first()
    ).toBeVisible();

    await member.page.goto(href);

    await member.page.getByPlaceholder("お礼や返信を書く").fill(reply);
    await member.page.getByRole("button", { name: "投稿", exact: true }).click();
    await expect(member.page.getByText(reply, { exact: true })).toBeVisible();
    const managerPage = manager.page;
    await expect(async () => {
      await managerPage.goto("/notifications?view=unread");
      await expect(
        managerPage.getByRole("main").getByText(/さんから返信が届きました/).first()
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
  } finally {
    await manager?.context.close();
    await member?.context.close();
    await admin?.context.close();
    await data.cleanup();
  }
});
