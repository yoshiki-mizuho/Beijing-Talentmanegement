import { expect, test } from "@playwright/test";
import { login, openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("MEMBERがスキルとレベルで人を探しプロフィールを開く", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.goto("/explore");
  await page.getByRole("combobox", { name: "探すスキル" }).fill("type");
  await page.getByRole("option", { name: "TypeScript" }).click();
  await page.getByRole("button", { name: "Lv4以上" }).click();
  await expect(page).toHaveURL(/skill=.+/);
  await expect(page).toHaveURL(/level=4/);
  const result = page.locator("#people-search li a").first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/people\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("いま伸びている技術から移動すると選択欄にスキル名が表示される", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.goto("/explore");
  const trendingSkill = page
    .getByRole("region", { name: "いま伸びている技術" })
    .getByRole("link")
    .first();
  const skillName = await trendingSkill.locator("strong").textContent();
  await trendingSkill.click();
  await expect(page).toHaveURL(/skill=.+/);
  await expect(page.getByRole("combobox", { name: "探すスキル" })).toHaveValue(skillName ?? "");
});

test("コンボボックスはキーボードだけでスキルを選べる", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.goto("/explore");
  const combobox = page.getByRole("combobox", { name: "探すスキル" });
  await combobox.fill("type");
  await combobox.press("ArrowDown");
  await combobox.press("Enter");
  await expect(page).toHaveURL(/skill=.+/);
});

test("本人が公開設定を切り替え、最後に公開へ戻す", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.getByLabel("アカウントメニューを開く").click();
  await page.getByRole("link", { name: "スキルプロフィール" }).click();
  await expect(page).toHaveURL(/\/people\//);
  const visibility = page.getByRole("switch", { name: "プロフィールを公開" });
  await expect(visibility).toBeVisible();
  if ((await visibility.getAttribute("aria-checked")) === "true") await visibility.click();
  await expect(visibility).toHaveAttribute("aria-checked", "false");
  await visibility.click();
  await expect(visibility).toHaveAttribute("aria-checked", "true");
});

test("非公開プロフィールは別のMEMBER相当の閲覧者に氏名を見せず、最後に公開へ戻す", async ({
  browser
}) => {
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  const member = await openLoggedInContext(browser, credentials.MEMBER);
  try {
    await dismissExistingLevelUpDialogs(member.page);
    await manager.page.getByLabel("アカウントメニューを開く").click();
    await manager.page.getByRole("link", { name: "スキルプロフィール" }).click();
    await expect(manager.page).toHaveURL(/\/people\//);
    const profileUrl = manager.page.url();
    const managerName = await manager.page.getByRole("heading", { level: 1 }).textContent();
    const visibility = manager.page.getByRole("switch", { name: "プロフィールを公開" });
    await expect(visibility).toBeVisible();
    if ((await visibility.getAttribute("aria-checked")) === "true") await visibility.click();
    await expect(visibility).toHaveAttribute("aria-checked", "false");

    await member.page.goto(profileUrl);
    await expect(
      member.page.getByRole("heading", { name: "このプロフィールは非公開です" })
    ).toBeVisible();
    if (managerName)
      await expect(member.page.getByText(managerName, { exact: true })).toHaveCount(0);
  } finally {
    await manager.page.goto(manager.page.url());
    const publish = manager.page.getByRole("switch", { name: "プロフィールを公開" });
    if ((await publish.getAttribute("aria-checked")) === "false") await publish.click();
    await manager.context.close();
    await member.context.close();
  }
});
