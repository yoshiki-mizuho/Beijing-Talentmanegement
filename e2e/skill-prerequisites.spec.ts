import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("ADMINがAI候補と手動追加を登録し削除できる", async ({ page }) => {
  await login(page, credentials.ADMIN);
  await page.goto("/skills?tab=prerequisites");
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
  await skillBox.fill("Python");
  await skillBox.press("ArrowDown");
  await skillBox.press("Enter");
  const prerequisiteBox = page.getByRole("combobox", { name: "前提スキル", exact: true });
  await prerequisiteBox.fill("PostgreSQL");
  await prerequisiteBox.press("ArrowDown");
  await prerequisiteBox.press("Enter");
  await page.getByRole("button", { name: "登録", exact: true }).click();
  await expect(page.getByRole("cell", { name: "手で追加" }).first()).toBeVisible();

  // seed にも手で追加した関係があるため、今回登録した組の行に絞る
  const manualRow = page
    .getByRole("row")
    .filter({ hasText: "手で追加" })
    .filter({ hasText: "Python" })
    .filter({ hasText: "PostgreSQL" });
  await manualRow.getByRole("button", { name: /関係を削除/ }).click();
  await page.getByRole("button", { name: "削除する" }).click();
  await expect(manualRow).toHaveCount(0);

  // 1件ずつ、一覧から消えたのを確かめてから次を削除する
  const aiRows = page.getByRole("row").filter({ hasText: "AI の候補から" });
  // 前回の失敗で残った分も含めて、AI の候補から登録した関係をすべて消す
  for (let remaining = await aiRows.count(); remaining > 0; remaining -= 1) {
    await aiRows.first().getByRole("button", { name: /関係を削除/ }).click();
    await page.getByRole("button", { name: "削除する" }).click();
    await expect(aiRows).toHaveCount(remaining - 1);
  }
});
