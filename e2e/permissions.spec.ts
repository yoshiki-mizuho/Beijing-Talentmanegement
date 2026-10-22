import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials, type DemoRole } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

const pages = [
  { path: "/dashboard", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/my/skills", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/explore", roles: ["ADMIN", "MANAGER", "MEMBER"] },
  { path: "/skill-approvals", roles: ["ADMIN", "MANAGER"] },
  { path: "/members", roles: ["ADMIN", "MANAGER"] },
  { path: "/skill-map", roles: ["ADMIN", "MANAGER"] },
  { path: "/skills", roles: ["ADMIN", "MANAGER"] },
  { path: "/roles", roles: ["ADMIN", "MANAGER"] },
  { path: "/csv", roles: ["ADMIN"] },
  { path: "/audit-logs", roles: ["ADMIN"] },
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
          await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
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
      page.request.post("/api/skills", { data: {} }),
      page.request.get("/api/csv/export/members"),
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
    await page.goto("/members");
    await dismissExistingLevelUpDialogs(page);
    await expect(
      page.getByRole("button", { name: "メンバーを追加", exact: true }),
    ).toHaveCount(0);
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
    const response = await page.request.get("/api/members");
    expect(response.status()).toBe(403);
  } finally {
    await context.close();
  }
});

test("ADMIN が権限を変更し監査ログを確認できる", async ({ browser }) => {
  const { context, page } = await openLoggedInContext(
    browser,
    credentials.ADMIN,
  );
  try {
    await page.goto("/members");
    await page.getByLabel("キーワード").fill("TM0003");
    const memberRow = page.getByRole("row").filter({ hasText: "TM0003" });
    await expect(memberRow).toBeVisible();
    await memberRow
      .getByRole("button", { name: "Member Userの詳細を開く" })
      .click();
    const detail = page.getByRole("dialog", { name: "Member Userの詳細" });
    await detail.getByRole("tab", { name: "アカウント" }).click();
    const permission = detail.getByLabel("権限");
    await permission.selectOption("MANAGER");
    await detail.getByRole("button", { name: "変更", exact: true }).click();
    await page
      .getByRole("dialog", { name: "権限を変更しますか" })
      .getByRole("button", { name: "変更する" })
      .click();
    await expect(page.getByText("権限を変更しました。")).toBeVisible();

    await page.goto("/audit-logs");
    await expect(
      page.getByText("権限を変更", { exact: false }).first(),
    ).toBeVisible();

    await page.goto("/members");
    await page.getByLabel("キーワード").fill("TM0003");
    const resetRow = page.getByRole("row").filter({ hasText: "TM0003" });
    await resetRow
      .getByRole("button", { name: "Member Userの詳細を開く" })
      .click();
    const resetDetail = page.getByRole("dialog", { name: "Member Userの詳細" });
    await resetDetail.getByRole("tab", { name: "アカウント" }).click();
    await resetDetail.getByLabel("権限").selectOption("MEMBER");
    await resetDetail
      .getByRole("button", { name: "変更", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "権限を変更しますか" })
      .getByRole("button", { name: "変更する" })
      .click();

    await page.goto("/members");
    await page.getByLabel("キーワード").fill("TM0001");
    const selfRow = page.getByRole("row").filter({ hasText: "TM0001" });
    await selfRow
      .getByRole("button", { name: "Admin Userの詳細を開く" })
      .click();
    await page
      .getByRole("dialog", { name: "Admin Userの詳細" })
      .getByRole("tab", { name: "アカウント" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Admin Userの詳細" }).getByLabel("権限"),
    ).toBeDisabled();
  } finally {
    await context.close();
  }
});
