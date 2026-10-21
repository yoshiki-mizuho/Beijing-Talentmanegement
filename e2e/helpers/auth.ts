import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

import type { DemoCredential } from "./credentials";

export async function login(
  page: Page,
  credential: DemoCredential,
  // 初回ログインではパスワードを決める画面へ移る
  expectedUrl: RegExp = /\/dashboard(?:\?.*)?$/
) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス", { exact: true }).fill(credential.email);
  await page.getByLabel("パスワード", { exact: true }).fill(credential.password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page).toHaveURL(expectedUrl);
}

export async function openLoggedInContext(
  browser: Browser,
  credential: DemoCredential,
  expectedUrl?: RegExp
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, credential, expectedUrl);
  return { context, page };
}
