import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者が残る3種類のCSVを出力できる", async ({ browser }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("CSV出力ノード");
  const account = await data.createMember({ label: "CSV出力管理者", nodeId: node.id, role: "ADMIN" });
  const skill = await data.createSkill("CSV出力対象");
  await data.createMemberSkill({ memberId: account.member.id, skillId: skill.skill.id, level: 3 });
  const admin = await openLoggedInContext(browser, account.credential);
  try {
    await admin.page.goto("/talent/csv?tab=export");
    for (const name of ["スキル", "メンバースキル", "ロール"]) {
      await expect(admin.page.getByRole("button", { name: `${name}のCSVを出力`, exact: true })).toBeVisible();
    }
    const memberSkills = await admin.page.request.get("/api/talent/v1/csv/export/member-skills");
    expect(memberSkills.status()).toBe(200);
    const memberSkillText = await memberSkills.text();
    expect(memberSkillText.split("\r\n")[0]).toBe(
      '\uFEFF"email","skill_code","level","years_of_experience","last_assessed_at"',
    );
    expect(memberSkillText).toContain(account.email);

    const roles = await admin.page.request.get("/api/talent/v1/csv/export/roles");
    expect(roles.status()).toBe(200);
    expect((await roles.text()).split("\r\n")[0]).toBe(
      '\uFEFF"role_code","role_name","description","is_active","skill_code","required_level","is_required","any_of_group"',
    );
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});

test("マネージャーはCSV出力APIを利用できない", async ({ browser }) => {
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  try {
    const response = await manager.page.request.get("/api/talent/v1/csv/export/skills");
    expect(response.status()).toBe(403);
  } finally {
    await manager.context.close();
  }
});
