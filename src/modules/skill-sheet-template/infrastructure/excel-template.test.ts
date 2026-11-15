import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { fillExcelTemplate } from "./excel-template";
import { createStandardTemplate } from "./standard-template";

describe("fillExcelTemplate", () => {
  it("繰り返し行を切り上げて複製し、結合と高さと文字列を保つ", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("test");
    sheet.mergeCells("A1:B1");
    sheet.getCell("A1").value = "{{スキル.名前}}";
    sheet.getCell("C1").value = "{{スキル.レベル}}";
    sheet.getCell("D1").value = "{{スキル.名前}}";
    sheet.getCell("E1").value = "{{スキル.レベル}}";
    sheet.getRow(1).height = 30;
    const input = Buffer.from(await workbook.xlsx.writeBuffer());
    const output = await fillExcelTemplate(input, {}, {
      経歴: [],
      スキル: [
        { "スキル.名前": "=1+1", "スキル.レベル": "5" },
        { "スキル.名前": "TypeScript", "スキル.レベル": "4" },
        { "スキル.名前": "SQL", "スキル.レベル": "3" }
      ],
      資格: []
    });
    const result = new ExcelJS.Workbook();
    await result.xlsx.load(new Uint8Array(output).buffer);
    const resultSheet = result.getWorksheet("test")!;
    expect(resultSheet.rowCount).toBe(2);
    expect(resultSheet.getCell("A1").value).toBe("=1+1");
    expect(typeof resultSheet.getCell("A1").value).toBe("string");
    expect(resultSheet.getCell("A2").value).toBe("SQL");
    expect(resultSheet.getRow(2).height).toBe(30);
    expect(resultSheet.model.merges).toContain("A2:B2");
  });

  it("0件の繰り返し行を消し、下の結合セルと値を1行上にずらす", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("test");
    sheet.getCell("A1").value = "{{資格}}";
    sheet.mergeCells("A2:B2");
    sheet.getCell("A2").value = "{{経歴.期間}}";
    sheet.mergeCells("A3:C3");
    sheet.getCell("A3").value = "下の行";
    const input = Buffer.from(await workbook.xlsx.writeBuffer());
    const output = await fillExcelTemplate(input, { 資格: "基本情報技術者" }, {
      経歴: [],
      スキル: [],
      資格: []
    });
    const result = new ExcelJS.Workbook();
    await result.xlsx.load(new Uint8Array(output).buffer);
    const resultSheet = result.getWorksheet("test")!;
    expect(resultSheet.getCell("A1").value).toBe("基本情報技術者");
    expect(resultSheet.getCell("A2").value).toBe("下の行");
    expect(resultSheet.model.merges).toEqual(["A2:C2"]);
  });

  it("標準ひな形を作って差し込める", async () => {
    const output = await fillExcelTemplate(await createStandardTemplate(), { 氏名: "山田" }, {
      経歴: [],
      スキル: [],
      資格: []
    });
    expect(output.byteLength).toBeGreaterThan(0);
  });
});
