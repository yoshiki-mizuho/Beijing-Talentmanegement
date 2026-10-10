import { test, type Page } from "@playwright/test";
import { login } from "../e2e/helpers/auth";
import { readDemoCredentials, type DemoRole } from "../e2e/helpers/credentials";

const selectedRole = process.env.UI_CHECK_ONLY?.toUpperCase();
const roles: DemoRole[] = ["ADMIN", "MANAGER", "MEMBER"];
if (selectedRole && !roles.includes(selectedRole as DemoRole)) throw new Error("UI_CHECK_ONLY は ADMIN、MANAGER、MEMBER のいずれかを指定してください。");
const credentials = readDemoCredentials();
const enabled = (role: DemoRole) => !selectedRole || selectedRole === role;
// 読み込み中の表示（スケルトン）を撮らないよう、通信が落ち着き見出しが出るまで待つ
const capture = async (page: Page, role: DemoRole, name: string) => {
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.screenshot({ path: `test-results/ui-check/${role}-${name}.png`, fullPage: true });
};

test.describe("UI check", () => {
  test("ADMIN", async ({ page }) => {
    test.skip(!enabled("ADMIN")); await login(page, credentials.ADMIN);
    await page.goto("/dashboard"); await capture(page, "ADMIN", "dashboard");
    await page.goto("/dashboard?view=organization"); await capture(page, "ADMIN", "organization");
    await page.goto("/members"); await capture(page, "ADMIN", "members");
    await page.getByRole("button", { name: "メンバーを追加" }).click(); await capture(page, "ADMIN", "member-create-dialog");
  });
  test("MANAGER", async ({ page }) => {
    test.skip(!enabled("MANAGER")); await login(page, credentials.MANAGER);
    await page.goto("/dashboard"); await capture(page, "MANAGER", "dashboard-team");
    const cheer = page.getByRole("button", { name: /応援する|応援しました/ }).first();
    if (await cheer.count()) { await cheer.click(); await capture(page, "MANAGER", "cheer-dialog"); }
    await page.goto("/members"); await page.getByRole("button", { name: "Member Userの詳細を開く" }).click();
    await page.getByRole("tab", { name: "1on1 メモ" }).click(); await capture(page, "MANAGER", "member-one-on-one");
    await page.getByRole("link", { name: "プロフィールを見る" }).click(); await page.waitForURL("**/people/**"); await capture(page, "MANAGER", "subordinate-profile");
    await page.goto("/skill-approvals"); await capture(page, "MANAGER", "skill-approvals");
  });
  test("MEMBER", async ({ page }) => {
    test.skip(!enabled("MEMBER")); await login(page, credentials.MEMBER);
    await page.goto("/dashboard"); await capture(page, "MEMBER", "dashboard");
    await page.goto("/explore"); await capture(page, "MEMBER", "explore");
    await page.getByLabel("アカウントメニューを開く").click(); await page.getByRole("link", { name: "スキルプロフィール" }).click(); await page.waitForURL("**/people/**"); await capture(page, "MEMBER", "skill-profile");
    await page.goto("/explore"); await page.getByRole("link", { name: /デモメンバー01/ }).first().click(); await page.waitForURL("**/people/**"); await capture(page, "MEMBER", "other-profile");
    await page.goto("/my/skills"); await capture(page, "MEMBER", "my-skills");
    await page.goto("/notifications"); await capture(page, "MEMBER", "notifications");
  });
});
