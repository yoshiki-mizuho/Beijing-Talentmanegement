import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login, openLoggedInContext } from "./helpers/auth";

test("ADMINが提案用シートを作成して保存でき、本人は開けない", async ({ browser, page }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("提案用シート部署");
  const admin = await data.createMember({
    label: "提案管理者",
    nodeId: node.id,
    role: "ADMIN"
  });
  const member = await data.createMember({ label: "提案対象", nodeId: node.id });
  const memberContext = await openLoggedInContext(browser, member.credential);
  try {
    await login(page, admin.credential);
    await page.goto(`/talent/people/${member.member.id}?tab=career`);
    await page.getByRole("button", { name: "経歴を追加" }).click();
    await page.getByLabel("開始年月").fill("2025-01");
    await page.getByLabel("業種").fill("製造");
    await page.getByLabel("規模").selectOption("5〜9人");
    await page.getByLabel("案件名").fill("E2E提案案件");
    await page.getByLabel("案件の概要（顧客名は書かない）").fill("受注管理を刷新した");
    await page.getByLabel("役割").selectOption("メンバー");
    await page.getByLabel("基本設計").check();
    await page
      .locator("form")
      .filter({ has: page.getByLabel("案件名") })
      .getByRole("button", { name: "保存", exact: true })
      .click();
    await expect(page.getByText("E2E提案案件")).toBeVisible();

    await page.goto(`/talent/proposal-sheets/${member.member.id}`);
    await page.getByRole("button", { name: "AI で下書きを作る" }).click();
    await expect(page.getByLabel("自己 PR")).toHaveValue(/【テスト用の下書き】/);
    await expect(page.getByLabel("E2E提案案件の説明文")).toHaveValue(/【テスト用】/);
    await page.getByLabel("自己 PR").fill("E2Eで修正した自己 PR");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("提案用スキルシートを保存しました。")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("自己 PR")).toHaveValue("E2Eで修正した自己 PR");

    await memberContext.page.goto(`/talent/proposal-sheets/${member.member.id}`);
    await expect(memberContext.page).toHaveURL(/\/talent\/dashboard$/);
  } finally {
    await memberContext.context.close();
    await data.cleanup();
  }
});

test("担当のMANAGERは部下の提案用シートを開ける", async ({ page }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("提案用シート上司部署");
  const manager = await data.createMember({
    label: "提案上司",
    nodeId: node.id,
    role: "MANAGER"
  });
  const member = await data.createMember({
    label: "提案部下",
    nodeId: node.id,
    leaderMemberId: manager.member.id
  });
  try {
    await login(page, manager.credential);
    await page.goto(`/talent/proposal-sheets/${member.member.id}`);
    await expect(page.getByRole("heading", { name: "提案用スキルシート", level: 1 })).toBeVisible();
  } finally {
    await data.cleanup();
  }
});
