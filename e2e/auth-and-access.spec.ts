import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials, type DemoRole } from "./helpers/credentials";

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
      await expect(page.getByRole("heading", { name: /ダッシュボード/ })).toBeVisible();
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

test("未認証ではダッシュボードからログイン画面へ遷移する", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  } finally {
    await context.close();
  }
});
