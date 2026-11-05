import { expect, test } from "@playwright/test";

import { prisma } from "../src/server/db/prisma";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("レベルアップのリアクション、コメント、返信を通知から確認できる", async ({ browser }) => {
  test.setTimeout(120_000);
  const startedAt = new Date();
  const comment = `E2E おめでとう ${startedAt.getTime()}`;
  const reply = `E2E ありがとう ${startedAt.getTime()}`;
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  let levelChangeId: string | null = null;

  try {
    await dismissExistingLevelUpDialogs(member.page);
    await member.page.goto("/dashboard?view=personal");
    const detailLink = member.page.locator('#growth-timeline a[href^="/level-ups/"]').first();
    await expect(detailLink).toBeVisible();
    const href = await detailLink.getAttribute("href");
    levelChangeId = href?.split("/").pop() ?? null;
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
      await member.page.goto("/notifications?view=unread");
      await expect(
        member.page.getByRole("main").getByText("レベルアップにリアクションが届きました", { exact: true })
      ).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    await member.page.goto(href);

    await member.page.getByPlaceholder("お礼や返信を書く").fill(reply);
    await member.page.getByRole("button", { name: "投稿", exact: true }).click();
    await expect(member.page.getByText(reply, { exact: true })).toBeVisible();
    await expect(async () => {
      await manager.page.goto("/notifications?view=unread");
      await expect(
        manager.page.getByRole("main").getByText(/さんから返信が届きました/).first()
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
  } finally {
    if (levelChangeId) {
      await prisma.$transaction([
        prisma.notification.deleteMany({
          where: { skillLevelChangeId: levelChangeId, createdAt: { gte: startedAt } }
        }),
        prisma.levelUpComment.deleteMany({
          where: { levelChangeId, body: { in: [comment, reply] } }
        }),
        prisma.levelUpReaction.deleteMany({
          where: { levelChangeId, createdAt: { gte: startedAt } }
        })
      ]);
    }
    await manager.context.close();
    await member.context.close();
    await admin.context.close();
  }
});
