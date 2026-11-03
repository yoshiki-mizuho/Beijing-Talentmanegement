import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

test("マネージャーは自部署と並列部署を見られ、範囲外は自部署へ戻る", async ({
  page,
}) => {
  await login(page, readDemoCredentials().MANAGER);
  await page.goto("/dashboard?view=organization");
  await expect(
    page.getByRole("link", { name: /開発部.*自分/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByText("事業推進本部", { exact: true })
      .locator("..")
      .getByLabel("見られません"),
  ).toBeVisible();
  await expect(
    page.getByText("事業推進本部", { exact: true }),
  ).not.toHaveAttribute("href");
  await page
    .getByRole("link", { name: /インフラ部/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /インフラ部/ })).toBeVisible();
  await page.goto("/dashboard?view=organization&department=not-in-scope");
  await expect(page.getByRole("heading", { name: /開発部/ })).toBeVisible();
});
