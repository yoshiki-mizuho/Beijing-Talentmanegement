import ExcelJS from "exceljs";

const border: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE3E8E6" } },
  left: { style: "thin", color: { argb: "FFE3E8E6" } },
  bottom: { style: "thin", color: { argb: "FFE3E8E6" } },
  right: { style: "thin", color: { argb: "FFE3E8E6" } }
};

export async function createStandardTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("スキルシート", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });
  sheet.columns = [
    { width: 14 }, { width: 22 }, { width: 12 }, { width: 18 },
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 },
    { width: 16 }, { width: 18 }, { width: 16 }, { width: 20 }
  ];
  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").value = "スキルシート";
  sheet.getCell("A1").font = { size: 18, bold: true };
  sheet.mergeCells("K1:L1");
  sheet.getCell("K1").value = "{{作成日}}";
  addPair(sheet, 3, "氏名", "{{氏名}}", "IT 経験", "{{IT経験年数}}");
  addWide(sheet, 4, "得意分野", "{{得意分野}}");
  addWide(sheet, 5, "資格", "{{資格}}");
  addWide(sheet, 6, "自己 PR", "{{自己PR}}");
  sheet.getRow(6).height = 72;

  sheet.mergeCells("A8:L8");
  heading(sheet.getCell("A8"), "スキル");
  const skillHeaders = ["スキル", "レベル", "スキル", "レベル", "スキル", "レベル"];
  skillHeaders.forEach((value, index) => {
    const start = index * 2 + 1;
    sheet.mergeCells(9, start, 9, start + 1);
    heading(sheet.getCell(9, start), value);
  });
  const skillMarkers = [
    "{{スキル.名前}}", "{{スキル.レベル}}",
    "{{スキル.名前}}", "{{スキル.レベル}}",
    "{{スキル.名前}}", "{{スキル.レベル}}"
  ];
  skillMarkers.forEach((value, index) => {
    const start = index * 2 + 1;
    sheet.mergeCells(10, start, 10, start + 1);
    sheet.getCell(10, start).value = value;
  });
  sheet.mergeCells("A11:L11");
  sheet.getCell("A11").value = "レベル　1：支援を受けて作業できる　2：定型作業を自力で進められる　3：通常業務で実用できる　4：複雑な課題を解決し主導できる　5：組織横断で標準化・育成できる";

  sheet.mergeCells("A13:L13");
  heading(sheet.getCell("A13"), "経歴");
  ["期間", "案件の概要", "業種", "役割・規模", "担当工程", "技術"].forEach((value, index) => {
    const starts = [1, 3, 7, 8, 10, 11];
    const ends = [2, 6, 7, 9, 10, 12];
    sheet.mergeCells(14, starts[index], 14, ends[index]);
    heading(sheet.getCell(14, starts[index]), value);
  });
  const careerValues = [
    "{{経歴.期間}}",
    "{{経歴.案件名}}\n{{経歴.説明}}",
    "{{経歴.業種}}",
    "{{経歴.役割}}\n{{経歴.規模}}",
    "{{経歴.工程}}",
    "{{経歴.技術}}"
  ];
  const starts = [1, 3, 7, 8, 10, 11];
  const ends = [2, 6, 7, 9, 10, 12];
  careerValues.forEach((value, index) => {
    sheet.mergeCells(15, starts[index], 15, ends[index]);
    sheet.getCell(15, starts[index]).value = value;
  });
  sheet.getRow(15).height = 70;

  sheet.eachRow((row) => row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = border;
    cell.alignment = { vertical: "top", wrapText: true };
  }));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function addPair(sheet: ExcelJS.Worksheet, row: number, first: string, firstValue: string, second: string, secondValue: string) {
  sheet.mergeCells(row, 1, row, 2);
  heading(sheet.getCell(row, 1), first);
  sheet.mergeCells(row, 3, row, 6);
  sheet.getCell(row, 3).value = firstValue;
  sheet.mergeCells(row, 7, row, 8);
  heading(sheet.getCell(row, 7), second);
  sheet.mergeCells(row, 9, row, 12);
  sheet.getCell(row, 9).value = secondValue;
}

function addWide(sheet: ExcelJS.Worksheet, row: number, label: string, value: string) {
  sheet.mergeCells(row, 1, row, 2);
  heading(sheet.getCell(row, 1), label);
  sheet.mergeCells(row, 3, row, 12);
  sheet.getCell(row, 3).value = value;
}

function heading(cell: ExcelJS.Cell, value: string) {
  cell.value = value;
  cell.font = { bold: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4F1" } };
}
