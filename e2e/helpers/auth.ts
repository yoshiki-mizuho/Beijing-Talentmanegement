import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { prisma } from "../../src/server/db/prisma";
import type { DemoCredential } from "./credentials";

const sharedDemoEmails = new Set(["admin@example.com", "manager@example.com", "member@example.com"]);

// 月初の振り返りの演出が、共用のデモアカウントでほかのテストの操作をふさがないようにする。
// 演出そのものは e2e/monthly-recap.spec.ts で確かめる。
async function markPreviousMonthRecapSeen(email: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousMonth = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  await prisma.member.updateMany({
    where: { users: { some: { email } } },
    data: { lastRecapSeenMonth: previousMonth }
  });
}

export async function login(
  page: Page,
  credential: DemoCredential,
  // 初回ログインではパスワードを決める画面へ移る
  expectedUrl: RegExp = /\/dashboard(?:\?.*)?$/
) {
  // 専用データのアカウントは、テストが用意した振り返りの状態をそのまま使う
  if (sharedDemoEmails.has(credential.email)) {
    await markPreviousMonthRecapSeen(credential.email);
  }
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
