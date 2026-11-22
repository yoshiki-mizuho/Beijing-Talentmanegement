import { expect, test } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
import { openLoggedInContext } from "./helpers/auth";

test("マネージャーは自分の範囲のノードを見られ、範囲外は自分のノードへ戻る", async ({
  browser,
}) => {
  const data = createE2eTestData();
  let session: Awaited<ReturnType<typeof openLoggedInContext>> | null = null;
  try {
    const parent = await data.createDepartment("親部署");
    const own = await data.createDepartment("自部署", parent.id);
    const sibling = await data.createDepartment("並列部署", parent.id);
    const outside = await data.createDepartment("範囲外部署");
    const manager = await data.createMember({ label: "組織管理者", nodeId: own.id, role: "MANAGER" });
    const ownNodeId = data.platformNodeId(own.id);
    const outsideNodeId = data.platformNodeId(outside.id);
    expect(ownNodeId).toBeTruthy();
    expect(outsideNodeId).toBeTruthy();
    session = await openLoggedInContext(browser, manager.credential);
    await session.page.goto("/talent/dashboard?view=organization");
    await expect(session.page.getByRole("link", { name: new RegExp(`${own.name}.*自分`) })).toHaveAttribute("aria-current", "page");
    await expect(session.page.getByRole("link", { name: new RegExp(sibling.name) })).toHaveCount(0);
    await session.page.goto(`/talent/dashboard?view=organization&node=${outsideNodeId}`);
    await expect(session.page.getByRole("heading", { name: new RegExp(own.name) })).toBeVisible();
  } finally {
    await session?.context.close();
    await data.cleanup();
  }
});
