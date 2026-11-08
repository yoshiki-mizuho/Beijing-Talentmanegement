import { expect, test } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
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
  const data = createE2eTestData();
  try {
    const department = await data.createDepartment("公開設定部署");
    const member = await data.createMember({ label: "公開設定本人", departmentId: department.id });
    await login(page, member.credential);
    await page.getByLabel("アカウントメニューを開く").click();
    await page.getByRole("link", { name: "スキルプロフィール" }).click();
    await expect(page).toHaveURL(/\/people\//);
    const visibility = page.getByRole("switch", { name: "プロフィールを公開" });
    await expect(visibility).toBeVisible();
    if ((await visibility.getAttribute("aria-checked")) === "true") await visibility.click();
    await expect(visibility).toHaveAttribute("aria-checked", "false");
    await visibility.click();
    await expect(visibility).toHaveAttribute("aria-checked", "true");
  } finally {
    await data.cleanup();
  }
});

test("MEMBERがプロフィールのひとことと相談タグを編集し、最後に元へ戻す", async ({ page }) => {
  const data = createE2eTestData();
  try {
    const department = await data.createDepartment("プロフィール部署");
    const member = await data.createMember({ label: "プロフィール本人", departmentId: department.id });
    await login(page, member.credential);
    await page.getByLabel("アカウントメニューを開く").click();
    await page.getByRole("link", { name: "スキルプロフィール" }).click();

  await page.getByRole("button", { name: "プロフィールを編集" }).first().click();
  const dialog = page.getByRole("dialog", { name: "プロフィールを編集" });
  const message = dialog.getByLabel("ひとこと");
  await message.fill("E2Eプロフィール更新");
  await dialog.getByRole("textbox", { name: "相談に乗れること" }).fill("E2E相談タグ");
  await dialog.getByRole("button", { name: "追加" }).click();
  await dialog.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("「E2Eプロフィール更新」")).toBeVisible();
  await expect(page.getByText("E2E相談タグ", { exact: true })).toBeVisible();

  } finally {
    await data.cleanup();
  }
});

test("非公開プロフィールは別のMEMBER相当の閲覧者に氏名を見せず、最後に公開へ戻す", async ({
  browser
}) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("非公開部署");
  const ownerAccount = await data.createMember({ label: "非公開本人", departmentId: department.id });
  const viewerAccount = await data.createMember({ label: "非公開閲覧者", departmentId: department.id });
  const manager = await openLoggedInContext(browser, ownerAccount.credential);
  const member = await openLoggedInContext(browser, viewerAccount.credential);
  try {
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
    await manager.context.close();
    await member.context.close();
    await data.cleanup();
  }
});
