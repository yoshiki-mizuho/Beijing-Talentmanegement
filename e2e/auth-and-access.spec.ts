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

test("本人のメニューから基盤へログアウトを要求してログイン画面へ移る", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    await page.route("**/api/v1/auth/logout", async (route) => {
      await route.fulfill({ status: 204 });
    });
    await page.locator('summary[aria-label="アカウントメニューを開く"]').click();

    const logoutRequest = page.waitForRequest((request) =>
      request.url().endsWith("/api/v1/auth/logout") && request.method() === "POST"
    );
    await page.getByRole("button", { name: "ログアウト" }).click();

    await expect(logoutRequest).resolves.toBeTruthy();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await context.close();
  }
});

test("マネージャーはCSV画面へアクセスするとダッシュボードへ戻される", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MANAGER);

  try {
    await page.goto("/talent/csv");
    await expect(page).toHaveURL(/\/talent\/dashboard(?:\?.*)?$/);
  } finally {
    await context.close();
  }
});

test("メンバーは管理対象画面へアクセスするとダッシュボードへ戻される", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MEMBER);

  try {
    for (const path of ["/talent/members", "/talent/skill-approvals"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/talent\/dashboard(?:\?.*)?$/);
    }
  } finally {
    await context.close();
  }
});

test("ヘッダが無いと画面は未登録案内、APIは401になる", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/talent/dashboard");
    await expect(page).toHaveURL(/\/talent\/unregistered$/);
    expect((await page.request.get("/api/talent/v1/members")).status()).toBe(401);
  } finally {
    await context.close();
  }
});

test("基盤に見つからない利用者も Hub 固有の行を自動作成して利用できる", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "X-Auth-Tenant-Id": "11111111-1111-4111-8111-111111111111",
      "X-Auth-User-Id": crypto.randomUUID(),
      "X-Auth-User-Role": "MEMBER"
    }
  });
  const page = await context.newPage();
  try {
    await page.goto("/talent/dashboard");
    await expect(page).toHaveURL(/\/talent\/dashboard$/);
    expect((await page.request.get("/api/talent/v1/members")).status()).toBe(403);
  } finally {
    await context.close();
  }
});

test("基盤で INACTIVE の利用者は画面とAPIを利用できない", async ({ browser }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("非在籍");
  const account = await data.createMember({
    label: "非在籍利用者",
    nodeId: node.id,
    platformStatus: "INACTIVE"
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
    await page.goto("/talent/dashboard");
    await expect(page).toHaveURL(/\/talent\/unregistered$/);
    expect((await page.request.get("/api/talent/v1/members")).status()).toBe(403);
  } finally {
    await context.close();
    await data.cleanup();
  }
});

test("DB の ADMIN は基盤が MEMBER なら管理画面を利用できない", async ({ browser }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("権限偽装");
  const account = await data.createMember({
    label: "DB管理者",
    nodeId: node.id,
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
    await page.goto("/talent/skills");
    await expect(page).toHaveURL(/\/talent\/dashboard$/);
  } finally {
    await context.close();
    await data.cleanup();
  }
});
