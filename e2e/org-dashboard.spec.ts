import { expect, test } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("マネージャーは自部署と並列部署を見られ、範囲外は自部署へ戻る", async ({
  browser,
}) => {
  const data = createE2eTestData();
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const parent = await data.createDepartment("親部署");
    const own = await data.createDepartment("自部署", parent.id);
    const sibling = await data.createDepartment("並列部署", parent.id);
    const outside = await data.createDepartment("範囲外部署");
    const manager = await data.createMember({ label: "組織管理者", departmentId: own.id, role: "MANAGER" });
    session = await openLoggedInContext(browser, manager.credential);
    await session.page.goto("/dashboard?view=organization");
    await expect(session.page.getByRole("link", { name: new RegExp(`${own.name}.*自分`) })).toHaveAttribute("aria-current", "page");
    await session.page.getByRole("link", { name: new RegExp(sibling.name) }).first().click();
    await expect(session.page.getByRole("heading", { name: new RegExp(sibling.name) })).toBeVisible();
    await session.page.goto(`/dashboard?view=organization&department=${outside.id}`);
    await expect(session.page.getByRole("heading", { name: new RegExp(own.name) })).toBeVisible();
  } finally {
    await session?.context.close();
    await data.cleanup();
  }
});
