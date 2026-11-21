import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { prisma } from "../../src/server/db/prisma";
import type { DemoCredential } from "./credentials";

const tenantId = "11111111-1111-4111-8111-111111111111";
const sharedDemoUserIds = new Set(readonlyDemoUserIds());

function readonlyDemoUserIds() {
  return [
    "22222222-2222-4222-8222-222222222222",
    "22222222-2222-4222-8222-000000000004",
    "22222222-2222-4222-8222-000000000005"
  ];
}

// 月初の振り返りの演出が、共用のデモアカウントでほかのテストの操作をふさがないようにする。
// 演出そのものは e2e/monthly-recap.spec.ts で確かめる。
async function markPreviousMonthRecapSeen(platformUserId: string) {
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
    where: { users: { some: { platformUserId } } },
    data: { lastRecapSeenMonth: previousMonth }
  });
}

export async function login(
  page: Page,
  credential: DemoCredential,
  expectedUrl: RegExp = /\/talent\/dashboard(?:\?.*)?$/
) {
  // 専用データのアカウントは、テストが用意した振り返りの状態をそのまま使う
  if (sharedDemoUserIds.has(credential.platformUserId)) {
    await markPreviousMonthRecapSeen(credential.platformUserId);
  }
  await page.context().setExtraHTTPHeaders({
    "X-Auth-Tenant-Id": tenantId,
    "X-Auth-Tenant-Slug": "local-dev",
    "X-Auth-User-Id": credential.platformUserId,
    "X-Auth-User-Role": credential.platformRole,
    "X-Auth-Request-Id": crypto.randomUUID()
  });
  await page.goto("/talent/dashboard");
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
