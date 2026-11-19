import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials, type DemoRole } from "./helpers/credentials";
import { createE2eTestData } from "./fixtures/test-data";

const credentials = readDemoCredentials();

const roles: { role: DemoRole; label: string }[] = [
  { role: "ADMIN", label: "管理者" },
  { role: "MANAGER", label: "マネージャー" },
  { role: "MEMBER", label: "メンバー" }
];

for (const { role, label } of roles) {
  test(`${label}でログインしてダッシュボードを表示できる`, async ({ browser }) => {
    const { context, page } = await openLoggedInContext(browser, credentials[role]);

    try {
      // 見出しの文言はロールで異なる（MEMBER は「おかえりなさい、…さん」）ため、ページの主見出しの表示を確認する。
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } finally {
      await context.close();
    }
  });
}

test("マネージャーはCSV画面へアクセスするとダッシュボードへ戻される", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MANAGER);

  try {
    await page.goto("/csv");
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  } finally {
    await context.close();
  }
});

test("メンバーは管理対象画面へアクセスするとダッシュボードへ戻される", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    for (const path of ["/members", "/skill-approvals"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
    }
  } finally {
    await context.close();
  }
});

test("ヘッダが無いと画面は未登録案内、APIは401になる", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/unregistered$/);
    expect((await page.request.get("/api/members")).status()).toBe(401);
  } finally {
    await context.close();
  }
});

test("登録されていない基盤利用者は画面とAPIを利用できない", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "X-Auth-Tenant-Id": "11111111-1111-4111-8111-111111111111",
      "X-Auth-User-Id": crypto.randomUUID(),
      "X-Auth-User-Role": "MEMBER"
    }
  });
  const page = await context.newPage();
  try {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/unregistered$/);
    expect((await page.request.get("/api/members")).status()).toBe(403);
  } finally {
    await context.close();
  }
});

test("DB の ADMIN は基盤が MEMBER なら管理画面を利用できない", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("権限偽装");
  const account = await data.createMember({
    label: "DB管理者",
    departmentId: department.id,
    role: "ADMIN"
  });
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "X-Auth-Tenant-Id": "11111111-1111-4111-8111-111111111111",
      "X-Auth-User-Id": account.credential.platformUserId,
      "X-Auth-User-Role": "MEMBER"
    }
  });
  const page = await context.newPage();
  try {
    await page.goto("/skills");
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    await context.close();
    await data.cleanup();
  }
});
