import { expect, test } from "@playwright/test";

import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("チームフィードのおめでとうリアクションを付け外しできる", async ({ browser }) => {
  const manager = await openLoggedInContext(browser, credentials.MANAGER);

  try {
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
    await manager.context.close();
  }
});

function getReactionCount(label: string | null) {
  const match = /おめでとう (\d+)件/.exec(label ?? "");
  if (!match) throw new Error("おめでとうリアクションの件数を取得できませんでした。");
  return Number(match[1]);
}
