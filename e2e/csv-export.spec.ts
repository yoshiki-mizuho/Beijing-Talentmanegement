import { expect, test } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者が5種類のCSVを出力して監査ログを確認できる", async ({
  browser,
}) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("CSV出力部署");
  const account = await data.createMember({ label: "CSV出力管理者", departmentId: department.id, role: "ADMIN" });
  const admin = await openLoggedInContext(browser, account.credential);
  try {
    await admin.page.goto("/csv?tab=export");
    for (const name of [
      "部署",
      "メンバー",
      "スキル",
      "メンバースキル",
      "ロール",
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
      '\uFEFF"employee_no","name","email","department_code","job_title","status","manager_employee_no","target_role_code"',
    );
    const all = await admin.page.request.get(
      "/api/csv/export/members?scope=all",
    );
    expect(all.status()).toBe(200);
    const roles = await admin.page.request.get("/api/csv/export/roles");
    expect(roles.status()).toBe(200);
    expect((await roles.text()).split("\r\n")[0]).toBe(
      '\uFEFF"role_code","role_name","description","is_active","skill_code","required_level","is_required","any_of_group"',
    );
    await admin.page.goto("/audit-logs?period=today&target=csv");
    await expect(
      admin.page.getByText(/メンバー.*CSV を出力/).first(),
    ).toBeVisible();
  } finally {
    await admin.context.close();
    await data.cleanup();
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
