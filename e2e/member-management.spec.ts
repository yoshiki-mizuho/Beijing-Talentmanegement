import { expect, test } from "@playwright/test";

import { login, openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者がメンバーを登録し、詳細で役職を更新して無効化できる", async ({
  browser,
}) => {
  // 登録したメンバーでの初回ログインとパスワードの設定も含むため長めにする
  test.slow();
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const uniqueSuffix = `${Date.now()}-${test.info().workerIndex}`;
  const employeeNo = `E2E-${uniqueSuffix}`;
  const memberName = `E2Eメンバー-${uniqueSuffix}`;
  const email = `member-${uniqueSuffix}@example.com`;
  const updatedJobTitle = `E2E役職-${uniqueSuffix}`;

  try {
    await admin.page.goto("/members");
    await admin.page
      .getByRole("button", { name: "メンバーを追加", exact: true })
      .click();

    const createDialog = admin.page.getByRole("dialog", {
      name: "メンバーを追加",
    });
    await createDialog.getByLabel("社員番号").fill(employeeNo);
    await createDialog.getByLabel("氏名").fill(memberName);
    await createDialog.getByLabel("メール").fill(email);
    await createDialog
      .getByRole("button", { name: "メンバーを追加", exact: true })
      .click();
    const resultDialog = admin.page.getByRole("dialog", {
      name: `${memberName}さんを登録しました`,
    });
    const initialPassword = await resultDialog.locator("p.font-mono").textContent();
    expect(initialPassword).toMatch(/^[A-HJ-NP-Za-km-z2-9]{4}(?:-[A-HJ-NP-Za-km-z2-9]{4}){2}$/);
    // 右上の × も「閉じる」なので、下の「閉じる」ボタンを押す
    await resultDialog.getByRole("button", { name: "閉じる" }).last().click();

    const newMember = await openLoggedInContext(browser, {
      email,
      password: initialPassword as string,
    }, /\/account\/password$/);
    try {
      await expect(newMember.page.getByLabel("現在のパスワード")).toHaveCount(0);
      await newMember.page.getByLabel("新しいパスワード").fill(`Changed-${uniqueSuffix}`);
      await newMember.page.getByLabel("もう一度入力").fill(`Changed-${uniqueSuffix}`);
      await newMember.page.getByRole("button", { name: "決めて始める" }).click();
      await expect(newMember.page).toHaveURL(/\/dashboard/);
    } finally {
      await newMember.context.close();
    }

    // 絞り込みの取得が終わる前に更新すると、古い一覧で詳細が上書きされるため、結果を待つ。
    const searchResponse = admin.page.waitForResponse(
      (response) =>
        response.url().includes("/api/members?") &&
        response.url().includes(`q=${employeeNo}`),
    );
    await admin.page.getByLabel("キーワード").fill(employeeNo);
    await searchResponse;
    const createdRow = admin.page
      .getByRole("row")
      .filter({ hasText: employeeNo });
    await expect(createdRow).toBeVisible();
    await createdRow
      .getByRole("button", { name: `${memberName}の詳細を開く` })
      .click();

    const detailDialog = admin.page.getByRole("dialog", {
      name: `${memberName}の詳細`,
    });
    await detailDialog.getByLabel("役職").fill(updatedJobTitle);
    await detailDialog
      .getByRole("button", { name: "基本情報を更新", exact: true })
      .click();
    await expect(
      admin.page.getByText("メンバー情報を更新しました。"),
    ).toBeVisible();
    await expect(detailDialog.getByLabel("役職")).toHaveValue(updatedJobTitle);

    await detailDialog.getByRole("button", { name: "初回ログイン用のパスワードを発行" }).click();
    await admin.page.getByRole("dialog", { name: "初回ログイン用のパスワードを発行しますか" })
      .getByRole("button", { name: "発行する" }).click();
    await expect(detailDialog.getByText(`${memberName}さんの初回ログイン用のパスワード`)).toBeVisible();

    await detailDialog
      .getByRole("button", { name: "無効化", exact: true })
      .click();
    const deactivateDialog = admin.page.getByRole("dialog", {
      name: "メンバーを無効化しますか",
    });
    await deactivateDialog
      .getByRole("button", { name: "無効化する", exact: true })
      .click();
    await expect(
      admin.page.getByText("メンバーを無効化しました。"),
    ).toBeVisible();
    await expect(detailDialog).toHaveCount(0);
    await expect(createdRow).toHaveCount(0);
  } finally {
    await admin.context.close();
  }
});

test("マネージャーの一覧と更新APIは自組織の範囲に制限される", async ({
  browser,
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  try {
    const response = await admin.page.request.get("/api/members?q=TM0103");
    const outsideMembers = (await response.json()) as { id: string }[];
    expect(outsideMembers).toHaveLength(1);

    await manager.page.goto("/members");
    await manager.page.getByLabel("キーワード").fill("TM0103");
    await expect(manager.page.getByText("デモメンバー03")).toHaveCount(0);

    await manager.page.getByLabel("キーワード").fill("");
    await manager.page.getByRole("button", { name: /の詳細を開く/ }).first().click();
    await expect(
      manager.page.getByRole("button", { name: "初回ログイン用のパスワードを発行" }),
    ).toHaveCount(0);

    const forbidden = await manager.page.request.patch(
      `/api/members/${outsideMembers[0].id}`,
      { data: {} },
    );
    expect(forbidden.status()).toBe(403);
  } finally {
    await admin.context.close();
    await manager.context.close();
  }
});

test(
  "メンバー一覧の絞り込みチップは外側や別のチップを押すと閉じる",
  async ({ page }) => {
    await login(page, credentials.ADMIN);
    await page.goto("/members");

    await page.getByText("部署", { exact: true }).click();
    await expect(page.getByRole("combobox", { name: "部署", exact: true })).toBeVisible();
    await page.getByRole("heading", { name: /メンバー一覧/ }).click();
    await expect(page.getByRole("combobox", { name: "部署", exact: true })).not.toBeVisible();

    await page.getByText("スキル", { exact: true }).click();
    await expect(page.getByRole("combobox", { name: "スキル", exact: true })).toBeVisible();
    await page.getByText("ロール", { exact: true }).click();
    await expect(page.getByRole("combobox", { name: "スキル", exact: true })).not.toBeVisible();
    await expect(page.getByRole("combobox", { name: "ロール", exact: true })).toBeVisible();
  }
);

test("URLから目標ロール未設定のメンバーに絞り込める", async ({ page }) => {
  await login(page, credentials.ADMIN);
  await page.goto("/members?targetRole=unset");

  const targetRoleFilters = page.getByRole("group", { name: "目標ロール" });
  await expect(targetRoleFilters.getByRole("button", { name: "未設定" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const resultRows = page
    .getByRole("table")
    .getByRole("row")
    .filter({ has: page.getByRole("cell") });
  await expect(resultRows.first()).toBeVisible();
  const count = await resultRows.count();
  for (let index = 0; index < count; index += 1) {
    await expect(resultRows.nth(index).getByRole("cell").nth(2)).toHaveText("未設定");
  }
});

test("チームダッシュボードのKPIから目標ロールで絞り込める", async ({ page }) => {
  await login(page, credentials.MANAGER);
  await page.goto("/dashboard?view=team");

  const unsetLink = page.getByRole("link", { name: /目標ロールの設定/ });
  const achievedLink = page.getByRole("link", { name: /ロール達成者/ });
  const link = (await unsetLink.getAttribute("href"))?.includes("targetRole=")
    ? unsetLink
    : achievedLink;
  await link.click();

  await expect(page).toHaveURL(/\/members\?targetRole=(unset|achieved)/);
  await expect(
    page
      .getByRole("group", { name: "目標ロール" })
      .locator('button[aria-pressed="true"]')
  ).toHaveCount(1);
});

test("スキルの面を押すと詳細が切り替わる", async ({ page }) => {
  await login(page, credentials.ADMIN);
  await page.goto("/skill-map");
  const tiles = page
    .locator("button[aria-pressed]")
    .filter({ has: page.locator("strong") });
  test.skip((await tiles.count()) < 2, "スキルが2件以上必要です");
  const second = tiles.nth(1);
  const name = await second.locator("strong").innerText();
  await second.click();
  await expect(
    page.getByRole("complementary", { name: `${name} の詳細` }),
  ).toBeVisible();
});

test("スキルマップの検索条件をクリアできる", async ({ page }) => {
  await login(page, credentials.ADMIN);
  await page.goto("/skill-map");

  const searchInput = page.getByLabel("スキルを探す");
  await searchInput.fill("TypeScript");
  const clearButton = page.getByRole("button", { name: "検索をクリア" });
  await expect(clearButton).toBeVisible();
  await clearButton.click();

  await expect(searchInput).toHaveValue("");
  await expect(searchInput).toBeFocused();
  await expect(clearButton).toHaveCount(0);
});
