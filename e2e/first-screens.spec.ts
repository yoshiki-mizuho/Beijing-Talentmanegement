import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("初めてのメンバーを3ステップで案内し、複数承認を1回で祝う", async ({ browser }) => {
  test.slow();
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const employeeNo = `FIRST-${suffix}`;
  const memberName = `初回画面-${suffix}`;
  const email = `first-${suffix}@example.com`;
  let memberContext: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;

  try {
    await admin.page.goto("/members");
    await admin.page.getByRole("button", { name: "メンバーを追加", exact: true }).click();
    const createDialog = admin.page.getByRole("dialog", { name: "メンバーを追加" });
    await createDialog.getByLabel("社員番号").fill(employeeNo);
    await createDialog.getByLabel("氏名").fill(memberName);
    await createDialog.getByLabel("メール").fill(email);
    await createDialog.getByRole("button", { name: "メンバーを追加", exact: true }).click();
    const resultDialog = admin.page.getByRole("dialog", { name: `${memberName}さんを登録しました` });
    const initialPassword = await resultDialog.locator("p.font-mono").textContent();
    expect(initialPassword).not.toBeNull();
    await resultDialog.getByRole("button", { name: "閉じる" }).last().click();

    memberContext = await openLoggedInContext(browser, {
      email,
      password: initialPassword as string
    }, /\/account\/password$/);
    const newPassword = `Changed-${suffix}`;
    await memberContext.page.getByLabel("新しいパスワード").fill(newPassword);
    await memberContext.page.getByLabel("もう一度入力").fill(newPassword);
    await memberContext.page.getByRole("button", { name: "決めて始める" }).click();
    await expect(memberContext.page.getByRole("heading", { name: `ようこそ、${memberName}さん` })).toBeVisible();
    await expect(memberContext.page.getByRole("heading", { name: "はじめの3ステップ" })).toBeVisible();
    await memberContext.page.getByRole("link", { name: "スキルを選ぶ" }).click();

    await expect(memberContext.page.getByRole("heading", { name: "得意なスキルを3つ選びましょう" })).toBeVisible();
    const groups = memberContext.page.locator('[role="group"][aria-label$="のレベル"]');
    // よく登録されているスキルは上位8件まで（データによっては少ない）
    await expect(groups.nth(1)).toBeVisible();
    expect(await groups.count()).toBeLessThanOrEqual(8);
    await groups.nth(0).getByRole("button", { name: "Lv3" }).click();
    await groups.nth(1).getByRole("button", { name: "Lv3" }).click();
    await memberContext.page.getByRole("button", { name: "上司に申請する" }).click();
    await expect(memberContext.page).toHaveURL(/\/dashboard/);
    await expect(memberContext.page.getByText("承認待ち 2件", { exact: true })).toBeVisible();

    await admin.page.goto("/skill-approvals");
    const approvals = admin.page.getByRole("listitem").filter({ hasText: memberName });
    await expect(approvals).toHaveCount(2);
    for (let index = 0; index < 2; index += 1) {
      await approvals.nth(index).getByRole("checkbox").check();
    }
    await admin.page.getByRole("button", { name: "選択した 2件を承認" }).click();
    await admin.page.getByRole("dialog").getByRole("button", { name: "承認する" }).click();
    // 承認が終わる前に再読み込みすると演出が出ないため、完了を待つ
    await expect(admin.page.getByText("2件の申請を承認しました。")).toBeVisible();

    await memberContext.page.reload();
    const celebration = memberContext.page.getByRole("dialog");
    await expect(celebration.getByRole("heading", { name: "2 つのスキルが登録されました" })).toBeVisible();
    await expect(celebration.getByRole("listitem")).toHaveCount(2);
    await celebration.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(memberContext.page.getByLabel("はじめの3ステップ進捗")).toHaveCount(0);
  } finally {
    await memberContext?.context.close();
    await admin.page.goto("/members");
    await admin.page.getByLabel("キーワード").fill(employeeNo);
    const row = admin.page.getByRole("row").filter({ hasText: employeeNo });
    if (await row.count()) {
      await row.getByRole("button", { name: `${memberName}の詳細を開く` }).click();
      const detail = admin.page.getByRole("dialog", { name: `${memberName}の詳細` });
      await detail.getByRole("button", { name: "無効化", exact: true }).click();
      await admin.page.getByRole("dialog", { name: "メンバーを無効化しますか" })
        .getByRole("button", { name: "無効化する" }).click();
    }
    await admin.context.close();
  }
});
