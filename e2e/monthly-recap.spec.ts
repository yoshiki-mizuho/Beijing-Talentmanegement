import { expect, test } from "@playwright/test";

import { prisma } from "../src/server/db/prisma";
import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test.setTimeout(120_000);

test("月初の振り返りを閉じると再表示されない", async ({ browser }) => {
  const fixture = await preparePreviousMonthRecap("本人");
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    session = await openLoggedInContext(browser, fixture.member.credential);
    await session.page.goto("/dashboard?view=personal");
    const dialog = session.page.getByRole("dialog").filter({ hasText: "先月の振り返り" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await session.page.reload();
    await expect(session.page.getByRole("dialog").filter({ hasText: "先月の振り返り" })).toHaveCount(0);
  } finally {
    await session?.context.close();
    await fixture.data.cleanup();
  }
});

test("マネージャーが振り返りから1on1メモを追加できる", async ({ browser }) => {
  const fixture = await preparePreviousMonthRecap("上司");
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    session = await openLoggedInContext(browser, fixture.manager.credential);
    await session.page.goto("/members");
    await session.page.getByRole("button", { name: `${fixture.member.member.name}の詳細を開く` }).click();
    const dialog = session.page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "振り返り" }).click();
    await dialog.getByRole("combobox").selectOption(fixture.monthKey);
    const row = dialog.getByRole("tabpanel", { name: "振り返り" }).getByRole("listitem").filter({ hasText: `${fixture.skill.name}：` }).first();
    await row.getByRole("button", { name: "1on1 メモに追加" }).click();
    const expected = `${fixture.skill.name} が Lv2 になった。どんな経験が効いたか、次に挑戦したいことを聞く`;
    await expect(row.locator("textarea")).toHaveValue(expected);
    await row.getByRole("button", { name: "追加する" }).click();
    await expect(row.getByText("メモに追加済み", { exact: true })).toBeVisible();
    expect(await prisma.oneOnOneNote.count({ where: { memberId: fixture.member.member.id, body: expected } })).toBe(1);
    await dialog.getByRole("tab", { name: "1on1 メモ" }).click();
    await expect(dialog.getByRole("tabpanel", { name: "1on1 メモ" }).getByText(expected, { exact: true })).toBeVisible();
  } finally {
    await session?.context.close();
    await fixture.data.cleanup();
  }
});

async function preparePreviousMonthRecap(label: string) {
  const data = createE2eTestData();
  const previous = getPreviousTokyoMonth();
  const department = await data.createDepartment(`${label}振り返り部署`);
  const manager = await data.createMember({ label: `${label}振り返り管理者`, departmentId: department.id, role: "MANAGER", createdAt: previous.memberCreatedAt });
  const member = await data.createMember({ label: `${label}振り返り本人`, departmentId: department.id, managerId: manager.member.id, createdAt: previous.memberCreatedAt, lastRecapSeenMonth: null });
  const { skill } = await data.createSkill(`${label}振り返りスキル`);
  await data.createMemberSkill({ memberId: member.member.id, skillId: skill.id, level: 2, approvedByMemberId: manager.member.id });
  const change = await data.createLevelChange({ memberId: member.member.id, skillId: skill.id, fromLevel: 1, toLevel: 2, changedByMemberId: manager.member.id, changedAt: previous.eventAt, createdAt: previous.eventAt });
  await data.createLevelUpReaction({ levelChangeId: change.id, memberId: manager.member.id, type: "CONGRATS", createdAt: previous.eventAt });
  return { data, manager, member, skill, monthKey: previous.monthKey };
}

function getPreviousTokyoMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const eventAt = new Date(Date.UTC(year, month - 2, 15, 3));
  return {
    monthKey: `${eventAt.getUTCFullYear()}-${String(eventAt.getUTCMonth() + 1).padStart(2, "0")}`,
    eventAt,
    memberCreatedAt: new Date(Date.UTC(eventAt.getUTCFullYear(), eventAt.getUTCMonth() - 1, 1, 3)),
  };
}
