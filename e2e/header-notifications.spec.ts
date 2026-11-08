import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("ヘッダーの通知ポップオーバーから通知一覧へ移動できる", async ({ browser }) => {
  const data = createE2eTestData();
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
  const department = await data.createDepartment("ヘッダー通知部署");
  const member = await data.createMember({ label: "ヘッダー通知本人", departmentId: department.id });
  await data.createNotification({
    recipientMemberId: member.member.id,
    type: "SKILL_ASSESSMENT_APPROVED",
    title: "ヘッダー通知の確認",
  });
  session = await openLoggedInContext(browser, member.credential);
  const page = session.page;

  await page.getByLabel(/通知を開く/).click();
  // ダッシュボードの成長の記録にも「すべて見る」があるため、通知一覧へのリンクに絞る。
  await page
    .getByRole("link", { name: "すべて見る" })
    .and(page.locator('[href="/notifications"]'))
    .click();

  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading", { level: 1, name: "通知" })).toBeVisible();
  } finally {
    await session?.context.close();
    await data.cleanup();
  }
});
