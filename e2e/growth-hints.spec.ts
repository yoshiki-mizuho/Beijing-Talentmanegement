import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("MANAGERが育成のヒントを作り1on1メモへ追加できる", async ({ browser }) => {
  const data = createE2eTestData();
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
  const department = await data.createDepartment("育成ヒント部署");
  const manager = await data.createMember({ label: "育成ヒント管理者", departmentId: department.id, role: "MANAGER" });
  const { skill } = await data.createSkill("育成ヒントスキル");
  const role = await data.createRole("育成ヒント目標", [{ skillId: skill.id, requiredLevel: 2 }]);
  const member = await data.createMember({ label: "育成ヒント部下", departmentId: department.id, managerId: manager.member.id, targetRoleId: role.id });
  await data.createMemberSkill({ memberId: member.member.id, skillId: skill.id, level: 1, approvedByMemberId: manager.member.id });
  session = await openLoggedInContext(browser, manager.credential);
  const page = session.page;
  await page.goto("/members");
  await page.getByRole("button", { name: `${member.member.name}の詳細を開く` }).click();
  await page.getByRole("tab", { name: "育成のヒント" }).click();
  await page.getByRole("button", { name: /ヒントを作る|作り直す/ }).click();

  await expect(page.getByText("AI", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "得意なこと" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "目標ロールまでに伸ばすとよいスキル" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "次の一歩" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1on1 で話すとよい話題" }),
  ).toBeVisible();

  const addButton = page
    .getByRole("button", { name: "＋ 1on1 メモに追加" })
    .first();
  if (await addButton.isVisible()) await addButton.click();
  await expect(page.getByText("✓ 追加済み").first()).toBeVisible();

  await page.getByRole("tab", { name: "1on1 メモ" }).click();
  await expect(page.getByRole("listitem").first()).toBeVisible();
  await page.getByRole("button", { name: "ダイアログを閉じる" }).click();
  await expect(page.getByText("✦ ヒント").first()).toBeVisible();
  } finally {
    await session?.context.close();
    await data.cleanup();
  }
});

test("MEMBERは育成のヒントを画面とメンバーAPIから利用できない", async ({
  browser,
}) => {
  const data = createE2eTestData();
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
  const department = await data.createDepartment("育成ヒント権限部署");
  const member = await data.createMember({ label: "育成ヒント権限本人", departmentId: department.id });
  session = await openLoggedInContext(browser, member.credential);
  const page = session.page;
  await page.goto("/members");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("tab", { name: "育成のヒント" })).toHaveCount(0);

  const response = await page.request.get("/api/members");
  expect(response.status()).toBe(403);
  } finally {
    await session?.context.close();
    await data.cleanup();
  }
});
