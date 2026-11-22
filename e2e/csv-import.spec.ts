import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者がスキルCSVを登録できる", async ({ browser }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("スキルCSV管理ノード");
  const account = await data.createMember({ label: "スキルCSV管理者", nodeId: node.id, role: "ADMIN" });
  const admin = await openLoggedInContext(browser, account.credential);
  const name = `E2Eスキル-${Date.now()}`;
  try {
    await admin.page.goto("/talent/csv");
    await admin.page.getByRole("button", { name: "スキル", exact: true }).click();
    await admin.page.getByLabel("スキルのCSVファイル").setInputFiles({
      name: "skills.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(`skill_code,skill_name,category_name,description,is_active\r\n,${name},開発,E2E,true\r\n`),
    });
    await admin.page.getByRole("button", { name: "1件を登録" }).click();
    await expect(admin.page.getByRole("heading", { name: "登録しました" })).toBeVisible();
    await data.trackCreated({ skillNames: [name] });
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});

test("保有スキルCSVは偽の基盤にいる利用者のメールで登録できる", async ({ browser }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("保有スキルCSVノード");
  const account = await data.createMember({ label: "保有スキルCSV管理者", nodeId: node.id, role: "ADMIN" });
  const skill = await data.createSkill("保有スキルCSV対象");
  const admin = await openLoggedInContext(browser, account.credential);
  try {
    await admin.page.goto("/talent/csv");
    await admin.page.getByRole("button", { name: "メンバースキル", exact: true }).click();
    await admin.page.getByLabel("メンバースキルのCSVファイル").setInputFiles({
      name: "member-skills.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `email,skill_code,level,years_of_experience,last_assessed_at\r\n${account.email},${skill.skill.code},4,3,2026-10-17\r\n`,
      ),
    });
    await admin.page.getByRole("button", { name: "1件を登録" }).click();
    await expect(admin.page.getByRole("heading", { name: "登録しました" })).toBeVisible();
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});

test("保有スキルCSVは基盤にいないメールを行エラーにする", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  try {
    await admin.page.goto("/talent/csv");
    await admin.page.getByRole("button", { name: "メンバースキル", exact: true }).click();
    await admin.page.getByLabel("メンバースキルのCSVファイル").setInputFiles({
      name: "member-skills.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "email,skill_code,level,years_of_experience,last_assessed_at\r\nmissing@local-dev.test,DEMO-SKILL-001,3,2,2026-10-17\r\n",
      ),
    });
    await expect(admin.page.getByText(/missing@local-dev\.test/)).toBeVisible();
    await expect(admin.page.getByRole("button", { name: /件を登録/ })).toBeDisabled();
  } finally {
    await admin.context.close();
  }
});

test("管理者がロールCSVをプレビューできる", async ({ browser }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("ロールCSVノード");
  const account = await data.createMember({ label: "ロールCSV管理者", nodeId: node.id, role: "ADMIN" });
  const admin = await openLoggedInContext(browser, account.credential);
  try {
    await admin.page.goto("/talent/csv");
    await admin.page.getByRole("button", { name: "ロール", exact: true }).click();
    await admin.page.getByLabel("ロールのCSVファイル").setInputFiles({
      name: "roles.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("role_code,role_name,description,is_active,skill_code,required_level,is_required,any_of_group\r\n,E2Eロール,,true,,,,\r\n"),
    });
    await expect(admin.page.getByText("新規").first()).toBeVisible();
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});
