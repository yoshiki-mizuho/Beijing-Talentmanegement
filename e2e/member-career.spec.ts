import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login, openLoggedInContext } from "./helpers/auth";

test("本人が経歴と資格を登録でき、別のMEMBERにはタブが見えない", async ({ browser, page }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("経歴部署");
  const owner = await data.createMember({ label: "経歴本人", departmentId: department.id });
  const viewer = await data.createMember({ label: "経歴閲覧者", departmentId: department.id });
  const other = await openLoggedInContext(browser, viewer.credential);
  try {
    await login(page, owner.credential);
    await page.goto(`/people/${owner.member.id}?tab=career`);
    await page.getByRole("button", { name: "経歴を追加" }).click();
    await page.getByLabel("開始年月").fill("2025-01");
    await page.getByLabel("業種").fill("製造");
    await page.getByLabel("規模").selectOption("5〜9人");
    await page.getByLabel("案件名").fill("E2E基幹システム刷新");
    await page.getByLabel("案件の概要（顧客名は書かない）").fill("受注管理を刷新した");
    await page.getByLabel("役割").selectOption("メンバー");
    await page.getByLabel("基本設計").check();
    await page
      .locator("form")
      .filter({ has: page.getByLabel("案件名") })
      .getByRole("button", { name: "保存", exact: true })
      .click();
    await expect(page.getByText("E2E基幹システム刷新")).toBeVisible();

    await page.getByLabel("資格名").fill("E2E基本情報技術者");
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(page.getByText("E2E基本情報技術者")).toBeVisible();

    await other.page.goto(`/people/${owner.member.id}`);
    await expect(other.page.getByRole("link", { name: "経歴・資格" })).toHaveCount(0);
  } finally {
    await other.context.close();
    await data.cleanup();
  }
});
