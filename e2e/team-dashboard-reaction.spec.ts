import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("チームフィードのおめでとうリアクションを付け外しできる", async ({ browser }) => {
  const data = createE2eTestData();
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;

  try {
    const department = await data.createDepartment("リアクション部署");
    const { skill } = await data.createSkill("リアクションスキル");
    const managerMember = await data.createMember({ label: "リアクション管理者", departmentId: department.id, role: "MANAGER" });
    const member = await data.createMember({ label: "リアクション部下", departmentId: department.id, managerId: managerMember.member.id });
    await data.createMemberSkill({ memberId: member.member.id, skillId: skill.id, level: 2, approvedByMemberId: managerMember.member.id });
    await data.createLevelChange({ memberId: member.member.id, skillId: skill.id, fromLevel: 1, toLevel: 2, changedByMemberId: managerMember.member.id });
    manager = await openLoggedInContext(browser, managerMember.credential);
    await manager.page.goto("/dashboard?view=team");
    const firstItem = manager.page.locator("#team-level-ups li").first();
    await expect(firstItem).toBeVisible();
    const reaction = firstItem.getByRole("button", { name: /おめでとう \d+件/ });

    if (await reaction.getAttribute("aria-pressed") === "true") {
      await reaction.click();
      await expect(reaction).toHaveAttribute("aria-pressed", "false");
    }

    const initialCount = getReactionCount(await reaction.getAttribute("aria-label"));
    await reaction.click();
    await expect(reaction).toHaveAttribute("aria-pressed", "true");
    await expect(reaction).toHaveAttribute("aria-label", `おめでとう ${initialCount + 1}件`);

    await reaction.click();
    await expect(reaction).toHaveAttribute("aria-pressed", "false");
    await expect(reaction).toHaveAttribute("aria-label", `おめでとう ${initialCount}件`);
  } finally {
    await manager?.context.close();
    await data.cleanup();
  }
});

function getReactionCount(label: string | null) {
  const match = /おめでとう (\d+)件/.exec(label ?? "");
  if (!match) throw new Error("おめでとうリアクションの件数を取得できませんでした。");
  return Number(match[1]);
}
