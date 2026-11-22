import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login } from "./helpers/auth";

test("基盤のアバターがあれば画像、なければ頭文字を表示する", async ({ page }) => {
  const data = createE2eTestData();
  try {
    const node = await data.createDepartment("アイコン部署");
    const avatarUrl = "/api/v1/users/e2e-avatar/avatar";
    const imageMember = await data.createMember({
      label: "画像本人",
      nodeId: node.id,
      avatarUrl
    });
    await page.route(`**${avatarUrl}`, (route) => route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgL8sDAAGLAPQ8xSAqAAAAAElFTkSuQmCC",
        "base64"
      )
    }));
    await login(page, imageMember.credential);
    await expect(page.getByLabel("アカウントメニューを開く").locator("img"))
      .toHaveAttribute("src", avatarUrl);

    const initialMember = await data.createMember({
      label: "頭文字本人",
      nodeId: node.id
    });
    await login(page, initialMember.credential);
    await expect(page.getByLabel("アカウントメニューを開く"))
      .toContainText(Array.from(initialMember.displayName)[0]);
  } finally {
    await data.cleanup();
  }
});
