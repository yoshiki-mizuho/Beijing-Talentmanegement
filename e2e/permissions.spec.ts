import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
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

test("ADMIN が権限を変更し、自分の権限は基盤で決まることを確認できる", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("権限変更部署");
  const memberAccount = await data.createMember({ label: "権限変更対象", departmentId: department.id });
  const { context, page } = await openLoggedInContext(
    browser,
    credentials.ADMIN,
  );
  try {
    await page.goto("/talent/members");
    await page.getByLabel("キーワード").fill(memberAccount.member.employeeNo);
    const memberRow = page.getByRole("row").filter({ hasText: memberAccount.member.employeeNo });
    await expect(memberRow).toBeVisible();
    await memberRow
      .getByRole("button", { name: `${memberAccount.member.name}の詳細を開く` })
      .click();
    const detail = page.getByRole("dialog", { name: `${memberAccount.member.name}の詳細` });
    await detail.getByRole("tab", { name: "アカウント" }).click();
    const permission = detail.getByLabel("権限", { exact: true });
    await permission.selectOption("MANAGER");
    await detail.getByRole("button", { name: "変更", exact: true }).click();
    await page
      .getByRole("dialog", { name: "権限を変更しますか" })
      .getByRole("button", { name: "変更する" })
      .click();
    await expect(page.getByText("権限を変更しました。")).toBeVisible();

    await page.goto("/talent/audit-logs");
    await expect(
      page.getByText("権限を変更", { exact: false }).first(),
    ).toBeVisible();

    await page.goto("/talent/members");
    await page.getByLabel("キーワード").fill("TM0001");
    const selfRow = page.getByRole("row").filter({ hasText: "TM0001" });
    await selfRow
      .getByRole("button", { name: /の詳細を開く/ })
      .click();
    const selfDetail = page.getByRole("dialog");
    await selfDetail.getByRole("tab", { name: "アカウント" }).click();
    await expect(selfDetail.getByLabel("権限", { exact: true })).toHaveCount(0);
    await expect(selfDetail.getByText("管理者（基盤で決まります）", { exact: true })).toBeVisible();
  } finally {
    await context.close();
    await data.cleanup();
  }
});
