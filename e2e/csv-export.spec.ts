import { expect, test } from "@playwright/test";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者が6種類のCSVを出力して監査ログを確認できる", async ({
  browser,
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  try {
    await admin.page.goto("/csv?tab=export");
    for (const name of [
      "部署",
      "メンバー",
      "スキル",
      "メンバースキル",
      "ロール",
      "ロール要件",
    ]) {
      await expect(
        admin.page.getByRole("link", {
          name: `${name}のCSVを出力`,
          exact: true,
        }),
      ).toBeVisible();
    }
    const active = await admin.page.request.get("/api/csv/export/members");
    expect(active.status()).toBe(200);
    expect((await active.text()).split("\r\n")[0]).toBe(
      '\uFEFF"employee_no","name","email","department_code","job_title","status","manager_employee_no","target_role_name"',
    );
    const all = await admin.page.request.get(
      "/api/csv/export/members?scope=all",
    );
    expect(all.status()).toBe(200);
    await admin.page.goto("/audit-logs?period=today&target=csv");
    await expect(
      admin.page.getByText(/メンバー.*CSV を出力/).first(),
    ).toBeVisible();
  } finally {
    await admin.context.close();
  }
});

test("マネージャーはCSV出力APIを利用できない", async ({ browser }) => {
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  try {
    const response = await manager.page.request.get("/api/csv/export/members");
    expect(response.status()).toBe(403);
  } finally {
    await manager.context.close();
  }
});
