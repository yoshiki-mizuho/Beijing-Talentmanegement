import { expect, test } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
import { login, openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("MEMBERがスキルとレベルで人を探しプロフィールを開く", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.goto("/talent/explore");
  await page.getByRole("combobox", { name: "探すスキル" }).fill("type");
  await page.getByRole("option", { name: "TypeScript" }).click();
  await page.getByRole("button", { name: "Lv4以上" }).click();
  await expect(page).toHaveURL(/skill=.+/);
  await expect(page).toHaveURL(/level=4/);
  const result = page.locator("#people-search li a").first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/talent\/people\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("いま伸びている技術から移動すると選択欄にスキル名が表示される", async ({ page }) => {
  // 直近 30 日のレベルアップから作る一覧なので、seed の古い履歴に頼らず 1 件作る。
  const data = createE2eTestData();
  try {
    const node = await data.createDepartment("伸びている技術部署");
    const member = await data.createMember({ label: "伸びている技術メンバー", nodeId: node.id });
    const { skill } = await data.createSkill("伸びている技術");
    await data.createLevelChange({ memberId: member.member.id, skillId: skill.id, fromLevel: 1, toLevel: 2 });
    await login(page, credentials.MEMBER);
    await dismissExistingLevelUpDialogs(page);
    await page.goto("/talent/explore");
    const trendingSkill = page
      .getByRole("region", { name: "いま伸びている技術" })
      .getByRole("link")
      .first();
    const skillName = await trendingSkill.locator("strong").textContent();
    await trendingSkill.click();
    await expect(page).toHaveURL(/skill=.+/);
    await expect(page.getByRole("combobox", { name: "探すスキル" })).toHaveValue(skillName ?? "");
  } finally {
    await data.cleanup();
  }
});

test("コンボボックスはキーボードだけでスキルを選べる", async ({ page }) => {
  await login(page, credentials.MEMBER);
  await dismissExistingLevelUpDialogs(page);
  await page.goto("/talent/explore");
  const combobox = page.getByRole("combobox", { name: "探すスキル" });
  await combobox.fill("type");
  await combobox.press("ArrowDown");
  await combobox.press("Enter");
  await expect(page).toHaveURL(/skill=.+/);
});

test("本人が公開設定を切り替え、最後に公開へ戻す", async ({ page }) => {
  const data = createE2eTestData();
  try {
    const node = await data.createDepartment("公開設定部署");
    const member = await data.createMember({ label: "公開設定本人", nodeId: node.id });
    await login(page, member.credential);
    await page.getByLabel("アカウントメニューを開く").click();
    await page.getByRole("banner").getByRole("link", { name: "マイスキル" }).click();
    await expect(page).toHaveURL(/\/talent\/people\//);
    const visibility = page.getByRole("switch", { name: "マイスキルを公開" });
    await expect(visibility).toBeVisible();
    await expect(visibility).toContainText("公開中");
    if ((await visibility.getAttribute("aria-checked")) === "true") await visibility.click();
    await expect(visibility).toHaveAttribute("aria-checked", "false");
    await expect(visibility).toContainText("非公開");
    await visibility.click();
    await expect(visibility).toHaveAttribute("aria-checked", "true");
    await expect(visibility).toContainText("公開中");
  } finally {
    await data.cleanup();
  }
});

test("MEMBERがプロフィールのひとことと相談タグを編集し、最後に元へ戻す", async ({ page }) => {
  const data = createE2eTestData();
  try {
    const node = await data.createDepartment("プロフィール部署");
    const member = await data.createMember({ label: "プロフィール本人", nodeId: node.id });
    await login(page, member.credential);
    await page.getByLabel("アカウントメニューを開く").click();
    await page.getByRole("banner").getByRole("link", { name: "マイスキル" }).click();

  await page.getByRole("button", { name: "マイスキルを編集" }).first().click();
  const dialog = page.getByRole("dialog", { name: "マイスキルを編集" });
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
  const node = await data.createDepartment("非公開部署");
  const ownerAccount = await data.createMember({ label: "非公開本人", nodeId: node.id });
  const viewerAccount = await data.createMember({ label: "非公開閲覧者", nodeId: node.id });
  const manager = await openLoggedInContext(browser, ownerAccount.credential);
  const member = await openLoggedInContext(browser, viewerAccount.credential);
  try {
    await manager.page.getByLabel("アカウントメニューを開く").click();
    await manager.page.getByRole("banner").getByRole("link", { name: "マイスキル" }).click();
    await expect(manager.page).toHaveURL(/\/talent\/people\//);
    const profileUrl = manager.page.url();
    const managerName = await manager.page.getByRole("heading", { level: 1 }).textContent();
    const visibility = manager.page.getByRole("switch", { name: "マイスキルを公開" });
    await expect(visibility).toBeVisible();
    if ((await visibility.getAttribute("aria-checked")) === "true") await visibility.click();
    await expect(visibility).toHaveAttribute("aria-checked", "false");

    await member.page.goto(profileUrl);
    await expect(
      member.page.getByRole("heading", { name: "このページは非公開です" })
    ).toBeVisible();
    if (managerName)
      await expect(member.page.getByText(managerName, { exact: true })).toHaveCount(0);
  } finally {
    await manager.context.close();
    await member.context.close();
    await data.cleanup();
  }
});
