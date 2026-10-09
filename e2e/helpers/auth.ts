import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

import type { DemoCredential } from "./credentials";

export async function login(page: Page, credential: DemoCredential) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(credential.email);
  await page.getByLabel("パスワード").fill(credential.password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

export async function openLoggedInContext(
  browser: Browser,
  credential: DemoCredential
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, credential);
  return { context, page };
}
