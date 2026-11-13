import { expect, test } from "@playwright/test";

import { createE2eTestData } from "./fixtures/test-data";
import { login, openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";
import { dismissExistingLevelUpDialogs } from "./helpers/level-up";

const credentials = readDemoCredentials();

test("管理者がメンバーを登録し、詳細で役職を更新して無効化できる", async ({
  browser,
}) => {
  // 登録したメンバーでの初回ログインとパスワードの設定も含むため長めにする
  test.slow();
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const data = createE2eTestData();
  const uniqueSuffix = `${Date.now()}-${test.info().workerIndex}`;
  const employeeNo = `E2E-${uniqueSuffix}`;
  const memberName = `E2Eメンバー-${uniqueSuffix}`;
  const email = `member-${uniqueSuffix}@example.com`;
  const updatedJobTitle = `E2E役職-${uniqueSuffix}`;

  try {
    await admin.page.goto("/members");
    await dismissExistingLevelUpDialogs(admin.page);
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
    await data.trackCreated({ memberEmails: [email] });
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
      await expect(
        newMember.page.getByRole("navigation", { name: "メインナビゲーション" }),
      ).toHaveCount(0);
      await expect(
        newMember.page.getByText("スキルを申請", { exact: true }),
      ).toHaveCount(0);
      await newMember.page.goto("/dashboard");
      await expect(newMember.page).toHaveURL(/\/account\/password$/);
      await newMember.page.getByLabel("新しいパスワード").fill(`Changed-${uniqueSuffix}`);
      await newMember.page.getByLabel("もう一度入力").fill(`Changed-${uniqueSuffix}`);
      await newMember.page.getByRole("button", { name: "決めて始める" }).click();
      await expect(newMember.page).toHaveURL(/\/dashboard/);
      await expect(
        newMember.page.locator("#first-steps li").first(),
      ).toContainText("目標ロールを決める");
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
    await expect(detailDialog.getByRole("tab", { name: "概要" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await detailDialog.getByRole("tab", { name: "アカウント" }).click();
    await detailDialog.getByLabel("役職").fill(updatedJobTitle);
    await detailDialog
      .getByRole("button", { name: "基本情報を保存", exact: true })
      .click();
    await expect(
      admin.page.getByText("メンバー情報を更新しました。"),
    ).toBeVisible();
    await expect(detailDialog.getByLabel("役職")).toHaveValue(updatedJobTitle);

    await detailDialog.getByRole("button", { name: "パスワードを発行" }).click();
    await admin.page.getByRole("dialog", { name: "初回ログイン用のパスワードを発行しますか" })
      .getByRole("button", { name: "発行する" }).click();
    await expect(detailDialog.getByLabel("初回ログイン用のパスワード")).toBeVisible();

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
    await data.cleanup();
  }
});

test("マネージャーの一覧と更新APIは自組織の範囲に制限される", async ({
  browser,
}) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("範囲内部署");
  const outsideDepartment = await data.createDepartment("範囲外部署");
  const managerAccount = await data.createMember({ label: "範囲管理者", departmentId: department.id, role: "MANAGER" });
  const adminAccount = await data.createMember({ label: "範囲確認管理者", departmentId: department.id, role: "ADMIN" });
  const report = await data.createMember({ label: "範囲内本人", departmentId: department.id, managerId: managerAccount.member.id });
  const outside = await data.createMember({ label: "範囲外本人", departmentId: outsideDepartment.id });
  const { skill } = await data.createSkill("範囲確認スキル");
  await data.createMemberSkill({ memberId: report.member.id, skillId: skill.id, level: 1, approvedByMemberId: managerAccount.member.id });
  const admin = await openLoggedInContext(browser, adminAccount.credential);
  const manager = await openLoggedInContext(browser, managerAccount.credential);
  try {
    const response = await admin.page.request.get(`/api/members?q=${outside.member.employeeNo}`);
    const outsideMembers = (await response.json()) as { id: string }[];
    expect(outsideMembers).toHaveLength(1);

    await manager.page.goto("/members");
    await manager.page.getByLabel("キーワード").fill(outside.member.employeeNo);
    await expect(manager.page.getByText(outside.member.name)).toHaveCount(0);

    await manager.page.getByLabel("キーワード").fill(report.member.employeeNo);
    const reportRow = manager.page.getByRole("row").filter({ hasText: report.member.employeeNo });
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole("button", { name: /の詳細を開く/ }).click();
    const managerDetail = manager.page.getByRole("dialog");
    await expect(managerDetail.getByRole("tab", { name: "概要" })).toBeVisible();
    await expect(managerDetail.getByRole("tab", { name: "育成のヒント" })).toBeVisible();
    await expect(managerDetail.getByRole("tab", { name: "1on1 メモ" })).toBeVisible();
    await expect(managerDetail.getByRole("tab", { name: "アカウント" })).toHaveCount(0);
    await expect(
      manager.page.getByRole("button", { name: "パスワードを発行" }),
    ).toHaveCount(0);

    // レベルを変えると並び順が変わるため、スキル名で行を特定する
    // 申請中の行（訂正なし）が上に出ることがあるので、「訂正」のある行から選ぶ
    const firstEditableRow = managerDetail
      .locator("div.py-3")
      .filter({ has: manager.page.getByRole("button", { name: "訂正", exact: true }) })
      .first();
    const skillName = (await firstEditableRow.locator("p.break-words").first().textContent()) ?? "";
    const skillRow = managerDetail.locator("div.py-3").filter({ hasText: skillName });
    // レベルの選択肢は見えない radio を label で包んでいるので、label を押す
    const levelLabel = (level: string) =>
      skillRow.locator("label").filter({ has: manager.page.locator(`input[value="${level}"]`) });
    await skillRow.getByRole("button", { name: "訂正", exact: true }).click();
    const checkedLevel = (await skillRow.locator('input[name="level"]:checked').getAttribute("value")) ?? "1";
    const correctedLevel = checkedLevel === "1" ? "2" : "1";
    await levelLabel(correctedLevel).click();
    await skillRow.getByRole("button", { name: "訂正する", exact: true }).click();
    await expect(manager.page.getByText("メンバーのスキルを設定しました。")).toBeVisible();
    await skillRow.getByRole("button", { name: "訂正", exact: true }).click();
    await levelLabel(checkedLevel).click();
    await skillRow.getByRole("button", { name: "訂正する", exact: true }).click();
    await expect(manager.page.getByText("メンバーのスキルを設定しました。").first()).toBeVisible();

    const inScopeResponse = await manager.page.request.get("/api/members");
    const inScopeMembers = (await inScopeResponse.json()) as { id: string }[];
    const forbiddenInScope = await manager.page.request.patch(
      `/api/members/${inScopeMembers[0].id}`,
      { data: {} },
    );
    expect(forbiddenInScope.status()).toBe(403);

    const forbidden = await manager.page.request.patch(
      `/api/members/${outside.member.id}`,
      { data: {} },
    );
    expect(forbidden.status()).toBe(403);
  } finally {
    await admin.context.close();
    await manager.context.close();
    await data.cleanup();
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

test("部下がいる上司は無効化できず、上司を外した後は無効化できる", async ({ browser }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("無効化確認部署");
  const manager = await data.createMember({
    label: "無効化確認上司",
    departmentId: department.id,
    role: "MANAGER",
  });
  const report = await data.createMember({
    label: "無効化確認部下",
    departmentId: department.id,
    managerId: manager.member.id,
  });
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  try {
    await admin.page.goto("/members");
    await admin.page.getByLabel("キーワード").fill(manager.member.employeeNo);
    const managerRow = admin.page.getByRole("row").filter({ hasText: manager.member.employeeNo });
    await managerRow.getByRole("button", { name: `${manager.member.name}の詳細を開く` }).click();
    let detailDialog = admin.page.getByRole("dialog", { name: `${manager.member.name}の詳細` });
    await detailDialog.getByRole("tab", { name: "アカウント" }).click();
    await detailDialog.getByRole("button", { name: "無効化", exact: true }).click();
    await admin.page.getByRole("dialog", { name: "メンバーを無効化しますか" })
      .getByRole("button", { name: "無効化する", exact: true }).click();
    await expect(admin.page.getByText("部下がいるメンバーは無効にできません。先に部下の上司を付け替えてください。")).toBeVisible();
    await detailDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    await admin.page.getByLabel("キーワード").fill(report.member.employeeNo);
    const reportRow = admin.page.getByRole("row").filter({ hasText: report.member.employeeNo });
    await reportRow.getByRole("button", { name: `${report.member.name}の詳細を開く` }).click();
    detailDialog = admin.page.getByRole("dialog", { name: `${report.member.name}の詳細` });
    await detailDialog.getByRole("tab", { name: "アカウント" }).click();
    await detailDialog.getByLabel("上司").selectOption("");
    await detailDialog.getByRole("button", { name: "上司を更新" }).click();
    await expect(admin.page.getByText("上司を更新しました。")).toBeVisible();
    await detailDialog.getByRole("button", { name: "ダイアログを閉じる" }).click();

    await admin.page.getByLabel("キーワード").fill(manager.member.employeeNo);
    await managerRow.getByRole("button", { name: `${manager.member.name}の詳細を開く` }).click();
    detailDialog = admin.page.getByRole("dialog", { name: `${manager.member.name}の詳細` });
    await detailDialog.getByRole("tab", { name: "アカウント" }).click();
    await detailDialog.getByRole("button", { name: "無効化", exact: true }).click();
    await admin.page.getByRole("dialog", { name: "メンバーを無効化しますか" })
      .getByRole("button", { name: "無効化する", exact: true }).click();
    await expect(admin.page.getByText("メンバーを無効化しました。")).toBeVisible();
  } finally {
    await admin.context.close();
    await data.cleanup();
  }
});

test("メンバー一覧の条件と詳細をURLから復元できる", async ({ page }) => {
  const data = createE2eTestData();
  const department = await data.createDepartment("URL復元部署");
  const account = await data.createMember({
    label: "URL復元対象",
    departmentId: department.id,
  });

  try {
    await login(page, credentials.ADMIN);
    await page.goto("/members");
    await page.getByLabel("キーワード").fill(account.member.employeeNo);

    // 社員番号に日本語が入るので、URL ではエンコードされた形で確かめる
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(account.member.employeeNo)}`));
    const memberRow = page.getByRole("row").filter({ hasText: account.member.employeeNo });
    await expect(memberRow).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("キーワード")).toHaveValue(account.member.employeeNo);
    await expect(memberRow).toBeVisible();

    await memberRow.getByRole("button", { name: `${account.member.name}の詳細を開く` }).click();
    await expect(page).toHaveURL(/member=/);
    await expect(page.getByRole("dialog", { name: `${account.member.name}の詳細` })).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/member=/);
    await expect(page.getByRole("dialog", { name: `${account.member.name}の詳細` })).toHaveCount(0);

    // 開いた直後に、URL のページ番号を1ページ目へ書き戻さない（キーワードの反映は 300ms 後に走る）
    await page.goto("/members?status=ALL&page=2");
    await expect(page.getByRole("button", { name: "在籍中", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/page=2/);

    // 存在しないメンバーの ID は、エラーにせず URL から外す
    await page.goto("/members?member=not-found-member");
    await expect(page).not.toHaveURL(/member=/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await data.cleanup();
  }
});

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
