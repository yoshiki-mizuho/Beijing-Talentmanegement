import ExcelJS from "exceljs";
import { expect, test, type Download } from "@playwright/test";
import { createE2eTestData } from "./fixtures/test-data";
import { login } from "./helpers/auth";

test("ADMINがひな形を登録し提案用シートをExcelで出力できる", async ({ page }) => {
  const data = createE2eTestData();
  const node = await data.createDepartment("ひな形部署");
  const admin = await data.createMember({
    label: "ひな形管理者",
    nodeId: node.id,
    role: "ADMIN"
  });
  const member = await data.createMember({ label: "ひな形対象", nodeId: node.id });
  try {
    await login(page, admin.credential);
    await page.goto(`/talent/people/${member.member.id}?tab=career`);
    await page.getByRole("button", { name: "経歴を追加" }).click();
    await page.getByLabel("開始年月").fill("2025-01");
    await page.getByLabel("業種").fill("製造");
    await page.getByLabel("規模").selectOption("5〜9人");
    await page.getByLabel("案件名").fill("E2E出力案件");
    await page.getByLabel("案件の概要（顧客名は書かない）").fill("出力対象の概要");
    await page.getByLabel("役割").selectOption("メンバー");
    await page.getByLabel("基本設計").check();
    await page
      .locator("form")
      .filter({ has: page.getByLabel("案件名") })
      .getByRole("button", { name: "保存", exact: true })
      .click();
    await expect(page.getByText("E2E出力案件")).toBeVisible();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("ひな形");
    sheet.getCell("A1").value = "{{氏名}}";
    sheet.getCell("A2").value = "{{自己PR}}";
    sheet.getCell("A3").value = "{{経歴.案件名}}";
    sheet.getCell("B3").value = "{{経歴.説明}}";
    sheet.getCell("A4").value = "{{最寄駅}}";
    const template = Buffer.from(await workbook.xlsx.writeBuffer());

    const templateName = `E2Eひな形-${Date.now()}`;
    await page.goto("/talent/skill-sheet-templates");
    await page.getByLabel("名前", { exact: true }).fill(templateName);
    await page.getByLabel("ファイル", { exact: true }).setInputFiles({
      name: "e2e-template.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: template
    });
    await expect(page.getByText(/知らない印 1個/)).toBeVisible();
    await page.getByRole("button", { name: "登録", exact: true }).click();
    await expect(page.getByText("ひな形を登録しました。")).toBeVisible();

    await page.goto(`/talent/proposal-sheets/${member.member.id}`);
    await page.getByRole("button", { name: "AI で下書きを作る" }).click();
    await page.getByLabel("表示名").fill("E2E表示名");
    await page.getByLabel("自己 PR").fill("E2E自己PR");
    await page.getByRole("combobox", { name: "ひな形" }).selectOption({ label: templateName });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel で出力" }).click();
    const output = await readDownload(await downloadPromise);
    const result = new ExcelJS.Workbook();
    await result.xlsx.load(new Uint8Array(output).buffer);
    expect(result.getWorksheet("ひな形")?.getCell("A1").value).toBe("E2E表示名");
    expect(result.getWorksheet("ひな形")?.getCell("A2").value).toBe("E2E自己PR");
    expect(result.getWorksheet("ひな形")?.getCell("A3").value).toBe("E2E出力案件");
    expect(result.getWorksheet("ひな形")?.getCell("B3").value).toMatch(/【テスト用】/);
    expect(result.getWorksheet("ひな形")?.getCell("A4").value).toBe("");

    await page.getByRole("combobox", { name: "ひな形" }).selectOption("standard");
    const standardDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel で出力" }).click();
    expect((await readDownload(await standardDownload)).byteLength).toBeGreaterThan(0);
  } finally {
    await data.cleanup();
  }
});

async function readDownload(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
