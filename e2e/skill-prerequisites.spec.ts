import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login } from "./helpers/auth";

test("ADMINがAI候補と手動追加を登録し削除できる", async ({ page }) => {
  const data = createE2eTestData();
  try {
  const department = await data.createDepartment("前提スキル部署");
  const admin = await data.createMember({ label: "前提スキル管理者", departmentId: department.id, role: "ADMIN" });
  const { skill } = await data.createSkill("前提元");
  const { skill: prerequisite } = await data.createSkill("前提先");
  await login(page, admin.credential);
  await page.goto("/skills?tab=prerequisites");
  const existingAiRows = await page.getByRole("row").filter({ hasText: "AI の候補から" }).count();
  await page.getByRole("button", { name: "候補を作る" }).click();

  const candidateChecks = page.locator('input[type="checkbox"]');
  await expect(candidateChecks.first()).toBeVisible();
  const checked = page.locator('input[type="checkbox"]:checked');
  // 自信の低い候補は最初からチェックが外れているため、0件なら1件選ぶ
  if (await checked.count() === 0) await candidateChecks.first().check();
  if (await checked.count() > 1) await checked.first().uncheck();
  await page.getByRole("button", { name: /選んだ \d+件を登録/ }).click();
  await expect(page.getByRole("cell", { name: "AI の候補から" }).first()).toBeVisible();

  await page.getByRole("button", { name: "＋ 手で追加" }).click();
  const skillBox = page.getByRole("combobox", { name: "スキル", exact: true });
  await skillBox.fill(skill.name);
  await skillBox.press("ArrowDown");
  await skillBox.press("Enter");
  const prerequisiteBox = page.getByRole("combobox", { name: "前提スキル", exact: true });
  await prerequisiteBox.fill(prerequisite.name);
  await prerequisiteBox.press("ArrowDown");
  await prerequisiteBox.press("Enter");
  await page.getByRole("button", { name: "登録", exact: true }).click();
  await expect(page.getByRole("cell", { name: "手で追加" }).first()).toBeVisible();

  // seed にも手で追加した関係があるため、今回登録した組の行に絞る
  const manualRow = page
    .getByRole("row")
    .filter({ hasText: "手で追加" })
    .filter({ hasText: skill.name })
    .filter({ hasText: prerequisite.name });
  await manualRow.getByRole("button", { name: /関係を削除/ }).click();
  await page.getByRole("button", { name: "削除する" }).click();
  await expect(manualRow).toHaveCount(0);

  // 1件ずつ、一覧から消えたのを確かめてから次を削除する
  const aiRows = page.getByRole("row").filter({ hasText: "AI の候補から" });
  for (let remaining = await aiRows.count(); remaining > existingAiRows; remaining -= 1) {
    await aiRows.first().getByRole("button", { name: /関係を削除/ }).click();
    await page.getByRole("button", { name: "削除する" }).click();
    await expect(aiRows).toHaveCount(remaining - 1);
  }
  } finally {
    await data.cleanup();
  }
});
