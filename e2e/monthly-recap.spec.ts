import { LevelUpReactionType } from "@prisma/client";
import { expect, test } from "@playwright/test";

import { prisma } from "../src/server/db/prisma";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

type RecapFixture = Awaited<ReturnType<typeof preparePreviousMonthRecap>>;

test("月初の振り返りを閉じると再表示されない", async ({ browser }) => {
  test.setTimeout(120_000);
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  let fixture: RecapFixture | null = null;
  try {
    await dismissExistingLevelUpDialogs(member.page);
    fixture = await preparePreviousMonthRecap();
    await member.page.goto("/dashboard?view=personal");
    const dialog = member.page.getByRole("dialog").filter({ hasText: "先月の振り返り" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await member.page.reload();
    await expect(member.page.getByRole("dialog").filter({ hasText: "先月の振り返り" })).toHaveCount(0);
  } finally {
    await cleanupRecapFixture(fixture);
    await member.context.close();
  }
});

test("マネージャーが振り返りから1on1メモを追加できる", async ({ browser }) => {
  test.setTimeout(120_000);
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  let fixture: RecapFixture | null = null;
  let noteId: string | null = null;
  try {
    await dismissExistingLevelUpDialogs(manager.page);
    fixture = await preparePreviousMonthRecap();
    await manager.page.goto("/members");
    await manager.page.getByRole("button", { name: "Member Userの詳細を開く" }).click();
    const dialog = manager.page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "振り返り" }).click();
    await dialog.getByRole("combobox").selectOption(fixture.monthKey);
    const main = dialog.getByRole("tabpanel", { name: "振り返り" });
    const row = main
      .getByRole("listitem")
      .filter({ hasText: `${fixture.skillName}：` })
      .filter({ hasText: `→ Lv${fixture.toLevel}` })
      .first();
    await row.getByRole("button", { name: "1on1 メモに追加" }).click();
    const expectedText = `${fixture.skillName} が Lv${fixture.toLevel} になった。どんな経験が効いたか、次に挑戦したいことを聞く`;
    await expect(row.locator("textarea")).toHaveValue(expectedText);
    await row.getByRole("button", { name: "追加する" }).click();
    await expect(row.getByText("メモに追加済み", { exact: true })).toBeVisible();

    const createdNote = await prisma.oneOnOneNote.findFirst({
      where: { memberId: fixture.memberId, body: expectedText },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    noteId = createdNote?.id ?? null;
    expect(noteId).not.toBeNull();
    await dialog.getByRole("tab", { name: "1on1 メモ" }).click();
    await expect(dialog.getByRole("tabpanel", { name: "1on1 メモ" }).getByText(expectedText, { exact: true })).toBeVisible();
  } finally {
    if (noteId) await prisma.oneOnOneNote.deleteMany({ where: { id: noteId } });
    await cleanupRecapFixture(fixture);
    await manager.context.close();
  }
});

async function preparePreviousMonthRecap() {
  const member = await prisma.member.findUniqueOrThrow({
    where: { employeeNo: "TM0003" },
    select: { id: true, lastRecapSeenMonth: true, managerId: true }
  });
  const manager = await prisma.member.findUniqueOrThrow({
    where: { employeeNo: "TM0002" },
    select: { id: true }
  });
  expect(member.managerId).toBe(manager.id);
  const previousMonth = getPreviousTokyoMonth();
  const nextMonthStart = new Date(Date.UTC(
    previousMonth.createdAt.getUTCFullYear(),
    previousMonth.createdAt.getUTCMonth() + 1,
    1,
    -9
  ));
  const levelChange = await prisma.skillLevelChange.findFirstOrThrow({
    where: {
      memberId: member.id,
      fromLevel: { not: null },
      changedAt: { gte: new Date(Date.UTC(previousMonth.createdAt.getUTCFullYear(), previousMonth.createdAt.getUTCMonth(), 1, -9)), lt: nextMonthStart }
    },
    orderBy: { changedAt: "desc" },
    select: { id: true, toLevel: true, skill: { select: { name: true } }, reactions: { where: { memberId: manager.id }, select: { type: true } } }
  });
  const usedTypes = new Set(levelChange.reactions.map((reaction) => reaction.type));
  const type = Object.values(LevelUpReactionType).find((candidate) => !usedTypes.has(candidate));
  if (!type) throw new Error("E2E用リアクションの未使用種類がありません。");
  const reaction = await prisma.levelUpReaction.create({
    data: { levelChangeId: levelChange.id, memberId: manager.id, type, createdAt: previousMonth.createdAt },
    select: { id: true }
  });
  await prisma.member.update({ where: { id: member.id }, data: { lastRecapSeenMonth: null } });
  return { memberId: member.id, originalSeenMonth: member.lastRecapSeenMonth, reactionId: reaction.id, monthKey: previousMonth.monthKey, skillName: levelChange.skill.name, toLevel: levelChange.toLevel };
}

async function cleanupRecapFixture(fixture: RecapFixture | null) {
  if (!fixture) return;
  await prisma.$transaction([
    prisma.levelUpReaction.deleteMany({ where: { id: fixture.reactionId } }),
    prisma.member.update({ where: { id: fixture.memberId }, data: { lastRecapSeenMonth: fixture.originalSeenMonth } })
  ]);
}

function getPreviousTokyoMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const previous = new Date(Date.UTC(year, month - 2, 15, 3));
  return { monthKey: `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`, createdAt: previous };
}
