import { test, type Page } from "@playwright/test";
import { login } from "../e2e/helpers/auth";
import { readDemoCredentials, type DemoRole } from "../e2e/helpers/credentials";

const selectedRole = process.env.UI_CHECK_ONLY?.toUpperCase();
const roles: DemoRole[] = ["ADMIN", "MANAGER", "MEMBER"];
if (selectedRole && !roles.includes(selectedRole as DemoRole))
  throw new Error(
    "UI_CHECK_ONLY は ADMIN、MANAGER、MEMBER のいずれかを指定してください。",
  );
const credentials = readDemoCredentials();
const enabled = (role: DemoRole) => !selectedRole || selectedRole === role;
// 読み込み中の表示（スケルトン）を撮らないよう、通信が落ち着き見出しが出るまで待つ
const capture = async (page: Page, role: DemoRole, name: string) => {
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.screenshot({
    path: `test-results/ui-check/${role}-${name}.png`,
    fullPage: true,
  });
};

test.describe("UI check", () => {
  test("ログイン", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: "ログイン", level: 1 }).waitFor();
    await page.screenshot({
      path: "test-results/ui-check/login.png",
      fullPage: true,
    });
  });

  test("ADMIN", async ({ page }) => {
    test.skip(!enabled("ADMIN"));
    await login(page, credentials.ADMIN);
    await page.goto("/dashboard");
    await capture(page, "ADMIN", "dashboard");
    await page.goto("/dashboard?view=organization");
    await capture(page, "ADMIN", "organization");
    await page.goto("/skill-map");
    await capture(page, "ADMIN", "skill-map");
    await page.goto("/members");
    await capture(page, "ADMIN", "members");
    await page.getByRole("button", { name: "メンバーを追加" }).click();
    await capture(page, "ADMIN", "member-create-dialog");
    await page.goto("/skills");
    await capture(page, "ADMIN", "skills");
    await page.goto("/roles");
    await capture(page, "ADMIN", "roles");
    await page.goto("/audit-logs");
    await capture(page, "ADMIN", "audit-logs");
    const firstAuditLog = page.locator("main details").first();
    if (await firstAuditLog.count()) {
      // 行の中の対象へのリンクを押さないよう、時刻の部分を押して開く
      await firstAuditLog.locator("summary time").click();
      await capture(page, "ADMIN", "audit-logs-detail");
    }
    await page.goto("/roles");
    await page.getByRole("button", { name: /の編集を開く$/ }).first().click();
    await capture(page, "ADMIN", "role-detail");
    await page.getByRole("heading", { name: "達成状況" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/ui-check/ADMIN-role-achievement.png" });
  });
  test("MANAGER", async ({ page }) => {
    test.skip(!enabled("MANAGER"));
    await login(page, credentials.MANAGER);
    await page.goto("/dashboard");
    await capture(page, "MANAGER", "dashboard-team");
    await page.goto("/dashboard?view=organization");
    await capture(page, "MANAGER", "organization");
    await page.goto("/skill-map");
    await capture(page, "MANAGER", "skill-map");
    await page.getByLabel(/通知を開く/).click();
    await capture(page, "MANAGER", "header-notifications");
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const cheer = page
      .getByRole("button", { name: /応援する|応援しました/ })
      .first();
    if (await cheer.count()) {
      await cheer.click();
      await capture(page, "MANAGER", "cheer-dialog");
      // MEMBER 側で応援の演出を撮るため、応援を1件送っておく（ローカルの DB にだけ残る）
      await page.getByLabel("メッセージ").fill("ui:check の応援です。いつもありがとうございます！");
      await page.getByRole("button", { name: "送信する" }).click();
      await page.getByText("応援を送りました").waitFor();
    }
    await page.goto("/members");
    await page.getByRole("button", { name: "Member Userの詳細を開く" }).click();
    await page.getByRole("tab", { name: "1on1 メモ" }).click();
    await capture(page, "MANAGER", "member-one-on-one");
    await page.getByRole("link", { name: "プロフィールを見る", exact: true }).click();
    await page.waitForURL("**/people/**");
    await capture(page, "MANAGER", "subordinate-profile");
    await page.goto("/skill-approvals");
    await capture(page, "MANAGER", "skill-approvals");
  });
  test("MEMBER", async ({ page }) => {
    test.skip(!enabled("MEMBER"));
    await login(page, credentials.MEMBER);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // 未確認のレベルアップ・応援の演出を撮ってから閉じる（閉じると残りもまとめて既読になる）
    const celebration = page.getByRole("dialog").filter({ hasText: /LEVEL UP|CHEER/ });
    for (let count = 1; count <= 10 && (await celebration.count()); count += 1) {
      await capture(page, "MEMBER", `celebration-${count}`);
      await celebration.getByRole("button", { name: "ダイアログを閉じる" }).click();
      await page.waitForLoadState("networkidle");
      await page.reload();
      await page.waitForLoadState("networkidle");
    }
    await capture(page, "MEMBER", "dashboard");
    await page.getByText("必要なスキルをすべて見る").click();
    await page.screenshot({ path: "test-results/ui-check/MEMBER-target-role-requirements.png" });
    await page.getByRole("button", { name: "変更" }).click();
    await page.screenshot({ path: "test-results/ui-check/MEMBER-target-role.png" });
    await page.getByRole("button", { name: "キャンセル" }).click();
    await page.getByLabel(/通知を開く/).click();
    await capture(page, "MEMBER", "header-notifications");
    await page.goto("/explore");
    await capture(page, "MEMBER", "explore");
    await page.getByRole("combobox", { name: "探すスキル" }).fill("フレーム");
    await capture(page, "MEMBER", "explore-combobox");
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Lv3以上" }).click();
    await page.waitForURL(/level=3/);
    await capture(page, "MEMBER", "explore-results");
    await page.getByLabel("アカウントメニューを開く").click();
    await page.getByRole("link", { name: "スキルプロフィール" }).click();
    await page.waitForURL("**/people/**");
    await capture(page, "MEMBER", "skill-profile");
    // アイコン画像を登録した状態を撮り、最後に削除して元に戻す（1×1 の PNG を 256px に拡大した単色の画像になる）
    await page.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgL8sDAAGLAPQ8xSAqAAAAAElFTkSuQmCC",
        "base64"
      )
    });
    await page.getByText("アイコン画像を変更しました。").waitFor();
    await capture(page, "MEMBER", "skill-profile-avatar");
    await page.getByRole("button", { name: "画像を削除" }).click();
    await page.getByText("アイコン画像を削除しました。").waitFor();
    await page.goto("/explore");
    await page
      .getByRole("link", { name: /デモメンバー01/ })
      .first()
      .click();
    await page.waitForURL("**/people/**");
    await capture(page, "MEMBER", "other-profile");
    await page.goto("/my/skills");
    await capture(page, "MEMBER", "my-skills");
    await page.goto("/notifications");
    await capture(page, "MEMBER", "notifications");
  });
});
