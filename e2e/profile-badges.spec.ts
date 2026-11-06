import { expect, test } from "@playwright/test";

import { prisma } from "../src/server/db/prisma";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test.setTimeout(120_000);

test("本人にはバッジの進み具合を表示し、他の人には表示しない", async ({ browser }) => {
  const member = await prisma.member.findFirstOrThrow({
    where: { users: { some: { email: credentials.MEMBER.email } } },
    select: { id: true }
  });
  const owner = await openLoggedInContext(browser, credentials.MEMBER);
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  try {
    await dismissExistingLevelUpDialogs(owner.page);
    await dismissExistingLevelUpDialogs(manager.page);
    await owner.page.goto(`/people/${member.id}`);
    const ownerMain = owner.page.getByRole("main");
    await expect(ownerMain.getByRole("heading", { name: /バッジ（\d+ \/ 19）/ })).toBeVisible();
    await expect(ownerMain.getByRole("progressbar").first()).toBeVisible();

    await manager.page.goto(`/people/${member.id}`);
    const managerMain = manager.page.getByRole("main");
    await expect(managerMain.getByRole("heading", { name: /バッジ（\d+ \/ 19）/ })).toBeVisible();
    await expect(managerMain.getByRole("progressbar")).toHaveCount(0);

    await ownerMain.getByRole("button", { name: "プロフィールを編集" }).first().click();
    await expect(owner.page.getByRole("dialog", { name: "プロフィールを編集" }).getByText("飾るバッジ")).toHaveCount(0);
  } finally {
    await owner.context.close();
    await manager.context.close();
  }
});
