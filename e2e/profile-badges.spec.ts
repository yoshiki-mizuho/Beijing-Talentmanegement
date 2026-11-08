import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test.setTimeout(120_000);

test("本人にはバッジの進み具合を表示し、他の人には表示しない", async ({ browser }) => {
  const data = createE2eTestData();
  let owner: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  let manager: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const department = await data.createDepartment("バッジ部署");
    const managerAccount = await data.createMember({ label: "バッジ管理者", departmentId: department.id, role: "MANAGER" });
    const member = await data.createMember({ label: "バッジ本人", departmentId: department.id, managerId: managerAccount.member.id });
    owner = await openLoggedInContext(browser, member.credential);
    manager = await openLoggedInContext(browser, managerAccount.credential);
    await owner.page.goto(`/people/${member.member.id}`);
    const ownerMain = owner.page.getByRole("main");
    await expect(ownerMain.getByRole("heading", { name: /バッジ（\d+ \/ 19）/ })).toBeVisible();
    await expect(ownerMain.getByRole("progressbar").first()).toBeVisible();

    await manager.page.goto(`/people/${member.member.id}`);
    const managerMain = manager.page.getByRole("main");
    await expect(managerMain.getByRole("heading", { name: /バッジ（\d+ \/ 19）/ })).toBeVisible();
    await expect(managerMain.getByRole("progressbar")).toHaveCount(0);

    await ownerMain.getByRole("button", { name: "プロフィールを編集" }).first().click();
    await expect(owner.page.getByRole("dialog", { name: "プロフィールを編集" }).getByText("飾るバッジ")).toHaveCount(0);
  } finally {
    await owner?.context.close();
    await manager?.context.close();
    await data.cleanup();
  }
});
