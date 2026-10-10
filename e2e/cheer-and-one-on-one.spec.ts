import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();
test("MANAGERの応援がMEMBERのダッシュボードに表示される", async ({ browser }) => {
  const managerContext = await browser.newContext(); const manager = await managerContext.newPage(); await login(manager, credentials.MANAGER);
  const cheerButton = manager.getByRole("button", { name: /Member Userを(?:応援する|応援しました)/ }); await expect(cheerButton).toBeVisible(); await cheerButton.click();
  const message = `E2E応援 ${Date.now()}`; await manager.getByLabel("メッセージ").fill(message); await manager.getByRole("button", { name: "送信する" }).click();
  await expect(manager.getByText("応援を送りました")).toBeVisible(); await managerContext.close();
  const memberContext = await browser.newContext(); const member = await memberContext.newPage(); await login(member, credentials.MEMBER);
  await expect(member.getByRole("heading", { name: "応援が届いています" })).toBeVisible(); await expect(member.getByText(message)).toBeVisible(); await memberContext.close();
});
test("MANAGERが1on1メモを追加して話した側へ移せる", async ({ page }) => {
  await login(page, credentials.MANAGER); await page.goto("/members"); await page.getByRole("button", { name: "Member Userの詳細を開く" }).click();
  await page.getByRole("tab", { name: "1on1 メモ" }).click(); const body = `E2E 1on1 ${Date.now()}`;
  await page.getByLabel("メモを追加").fill(body); await page.getByRole("button", { name: "追加する" }).click();
  const item = page.getByRole("listitem").filter({ hasText: body }); await expect(item).toBeVisible(); await item.getByRole("checkbox", { name: "話した" }).click(); await expect(item.getByText(/話した日：/)).toBeVisible();
});
