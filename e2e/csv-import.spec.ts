import { expect, test } from "@playwright/test";
import { openLoggedInContext } from "./helpers/auth";
import { readDemoCredentials } from "./helpers/credentials";

const credentials = readDemoCredentials();

test("管理者が部署CSVを確認して登録し監査ログを確認できる", async ({
  browser,
}) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const suffix = Date.now();
  const code = `E2E-${suffix}`;
  let created = false;
  try {
    await admin.page.goto("/csv");
    await admin.page.getByLabel("部署のCSVファイル").setInputFiles({
      name: "departments.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `department_code,department_name,parent_department_code,is_active\r\n${code},E2E部署,,true\r\nDEV,開発部 E2E,,true\r\n`,
      ),
    });
    await expect(admin.page.getByText("新規").first()).toBeVisible();
    await expect(admin.page.getByText("更新").first()).toBeVisible();
    await expect(admin.page.getByText(`${code} E2E部署`)).toBeVisible();
    await admin.page.getByRole("button", { name: "2件を登録" }).click();
    await expect(
      admin.page.getByRole("heading", { name: "登録しました" }),
    ).toBeVisible();
    created = true;
    await admin.page.getByRole("link", { name: "監査ログを見る" }).click();
    await expect(
      admin.page.getByText(/部署.*CSV を取り込み/).first(),
    ).toBeVisible();
  } finally {
    if (created) {
      await importByApi(
        admin.page,
        "departments",
        `department_code,department_name,parent_department_code,is_active\r\n${code},E2E部署,,false\r\nDEV,開発部,,true\r\n`,
      );
    }
    await admin.context.close();
  }
});

test("管理者が空コードのスキルCSVを登録できる", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  const name = `E2Eスキル-${Date.now()}`;
  try {
    await admin.page.goto("/csv");
    await admin.page
      .getByRole("button", { name: "スキル", exact: true })
      .click();
    await admin.page.getByLabel("スキルのCSVファイル").setInputFiles({
      name: "skills.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `skill_code,skill_name,category_name,description,is_active\r\n,${name},プログラミング言語,E2E,true\r\n`,
      ),
    });
    await admin.page.getByRole("button", { name: "1件を登録" }).click();
    await expect(
      admin.page.getByRole("heading", { name: "登録しました" }),
    ).toBeVisible();
    await admin.page.goto("/skills");
    await expect(admin.page.getByText(name)).toBeVisible();
  } finally {
    const exported = await admin.page.request.get("/api/csv/export/skills");
    const row = (await exported.text())
      .split("\r\n")
      .find((line) => line.includes(name));
    const code = row?.match(/^"([^"]+)"/)?.[1];
    if (code) {
      await importByApi(
        admin.page,
        "skills",
        `skill_code,skill_name,category_name,description,is_active\r\n${code},${name},プログラミング言語,E2E,false\r\n`,
      );
    }
    await admin.context.close();
  }
});

test("検証エラーがあるCSVは登録できない", async ({ browser }) => {
  const admin = await openLoggedInContext(browser, credentials.ADMIN);
  try {
    await admin.page.goto("/csv");
    await admin.page.getByLabel("部署のCSVファイル").setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "department_code,department_name,parent_department_code,is_active\r\nBROKEN,,UNKNOWN,yes\r\n",
      ),
    });
    await expect(
      admin.page.getByRole("heading", { name: /エラー 3件/ }),
    ).toBeVisible();
    await expect(
      admin.page.getByText("department_name は必須です"),
    ).toBeVisible();
    await expect(
      admin.page.getByRole("button", { name: /件を登録/ }),
    ).toBeDisabled();
  } finally {
    await admin.context.close();
  }
});

test("マネージャーはCSV取り込みAPIを利用できない", async ({ browser }) => {
  const manager = await openLoggedInContext(browser, credentials.MANAGER);
  try {
    const response = await manager.page.request.post(
      "/api/csv/import/departments/preview",
      {
        data: "department_code,department_name,parent_department_code,is_active\nX,X,,true\n",
        headers: { "content-type": "application/octet-stream" },
      },
    );
    expect(response.status()).toBe(403);
  } finally {
    await manager.context.close();
  }
});

async function importByApi(
  page: import("@playwright/test").Page,
  target: "departments" | "skills",
  csv: string,
) {
  const previewResponse = await page.request.post(
    `/api/csv/import/${target}/preview`,
    {
      data: Buffer.from(csv),
      headers: { "content-type": "application/octet-stream" },
    },
  );
  const preview = await previewResponse.json();
  await page.request.post(`/api/csv/import/${target}/commit`, {
    data: Buffer.from(csv),
    headers: {
      "content-type": "application/octet-stream",
      "x-preview-token": preview.previewToken,
      "x-file-name": "e2e-cleanup.csv",
    },
  });
}
