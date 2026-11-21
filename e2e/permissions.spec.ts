import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials, type DemoRole } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

const pages = [
  { path: "/talent/dashboard", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/talent/my/skills", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/talent/explore", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/talent/skill-approvals", roles: ["ADMIN", "MANAGER"] },
  { path: "/talent/members", roles: ["ADMIN", "MANAGER"] },
  { path: "/talent/skill-map", roles: ["ADMIN", "MANAGER"] },
  { path: "/talent/skills", roles: ["ADMIN"] },
  { path: "/talent/roles", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/talent/csv", roles: ["ADMIN"] },
  { path: "/talent/audit-logs", roles: ["ADMIN"] },
] satisfies Array<{ path: string; roles: DemoRole[] }>;

for (const role of ["ADMIN", "MANAGER", "MEMBER"] as const) {
  test(`${role} の画面アクセス`, async ({ browser }) => {
    const { context, page } = await openLoggedInContext(
      browser,
      credentials[role],
    );
    try {
      for (const target of pages) {
        await page.goto(target.path);
        if (target.roles.includes(role)) {
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        } else {
          await expect(page).toHaveURL(/\/talent\/dashboard(?:\?.*)?$/);
        }
      }
    } finally {
      await context.close();
    }
  });
}

test("MANAGER の ADMIN 専用 API は 403", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(
    browser,
    credentials.MANAGER,
  );
  try {
    const results = await Promise.all([
      page.request.post("/api/talent/v1/skills", { data: {} }),
      page.request.get("/api/talent/v1/csv/export/members"),
    ]);
    for (const response of results) {
      expect(response.status()).toBe(403);
    }
  } finally {
    await context.close();
  }
});
test("MANAGER のメンバー一覧にメンバー追加操作がない", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(
    browser,
    credentials.MANAGER,
  );
  try {
    await page.goto("/talent/members");
    await dismissExistingLevelUpDialogs(page);
    await expect(
      page.getByRole("button", { name: "メンバーを追加", exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
test("MANAGER のナビにスキル管理がなくロールで担当状況を確認できる", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MANAGER);
  try {
    await page.goto("/talent/dashboard");
    await expect(page.getByRole("link", { name: "スキル管理" })).toHaveCount(0);
    await page.goto("/talent/skills");
    await expect(page).toHaveURL(/\/talent\/dashboard(?:\?.*)?$/);
    await page.goto("/talent/roles");
    await expect(page.getByRole("heading", { name: "担当メンバーの状況" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("MEMBER がロールと自分の達成状況を確認できる", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(browser, credentials.MEMBER);
  try {
    await page.goto("/talent/roles");
    await dismissExistingLevelUpDialogs(page);
    await expect(page.getByRole("heading", { name: "ロール", level: 1 })).toBeVisible();
    await expect(page.getByText(/あなた：/).first()).toBeVisible();
    await expect(page.getByText("担当メンバーの状況")).toHaveCount(0);
    await expect(page.getByText("全社の状況")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("MEMBER のメンバー API は 403", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(
    browser,
    credentials.MEMBER,
  );
  try {
    const response = await page.request.get("/api/talent/v1/members");
    expect(response.status()).toBe(403);
  } finally {
    await context.close();
  }
});
