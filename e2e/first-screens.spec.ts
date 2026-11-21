import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("スマホ幅でセットアップ進捗と一覧が画面内に収まる", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("スマホヘッダー確認部署");
  const account = await data.createMember({
    label: "スマホヘッダー確認メンバー",
    departmentId: department.id
  });
  const member = await openLoggedInContext(browser, account.credential);

  try {
    await member.page.setViewportSize({ width: 375, height: 812 });
    await member.page.goto("/talent/dashboard");

    expect(
      await member.page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);

    const summary = member.page.locator(
      'summary[aria-label="はじめの3ステップ 0 / 3"]'
    );
    await expect(summary.getByText("0/3", { exact: true })).toBeVisible();
    await summary.click();

    const panel = member.page
      .locator("details", { has: summary })
      .locator("> div");
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBeGreaterThanOrEqual(12);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(363);
  } finally {
    await member.context.close();
    await data.cleanup();
  }
});
