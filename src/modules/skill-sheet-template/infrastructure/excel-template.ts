import ExcelJS, { type Cell, type CellValue, type Worksheet } from "exceljs";
import {
  countRepeatingSets,
  extractMarkers,
  inspectMarkerRows,
  repeatingGroupForRow,
  replaceMarkers,
  type RepeatingMarkerGroup,
  type SkillSheetMarkerValues,
  type SkillSheetRepeatingValues
} from "../domain/skill-sheet-markers";

export type TemplateInspection = {
  known: string[];
  unknown: string[];
  errors: string[];
};

export async function inspectExcelTemplate(content: Uint8Array): Promise<TemplateInspection> {
  const workbook = await loadWorkbook(content);
  const inspections = workbook.worksheets.map((worksheet) =>
    inspectMarkerRows(readRows(worksheet))
  );
  return {
    known: unique(inspections.flatMap((item) => item.known)),
    unknown: unique(inspections.flatMap((item) => item.unknown)),
    errors: inspections.flatMap((item) => item.errors)
  };
}

export async function fillExcelTemplate(
  content: Uint8Array,
  singles: SkillSheetMarkerValues,
  repeating: SkillSheetRepeatingValues
) {
  const workbook = await loadWorkbook(content);
  for (const worksheet of workbook.worksheets) {
    fillWorksheet(worksheet, singles, repeating);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function loadWorkbook(content: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(content).buffer);
  return workbook;
}

function fillWorksheet(
  worksheet: Worksheet,
  singles: SkillSheetMarkerValues,
  repeating: SkillSheetRepeatingValues
) {
  const repeatingRows = readRows(worksheet)
    .map((cells, index) => ({ rowNumber: index + 1, cells, group: repeatingGroupForRow(cells) }))
    .filter((row): row is typeof row & { group: RepeatingMarkerGroup } => row.group !== null)
    .reverse();

  for (const templateRow of repeatingRows) {
    const values = repeating[templateRow.group];
    const setsPerRow = countRepeatingSets(templateRow.cells, templateRow.group);
    const requiredRows = values.length === 0 ? 0 : Math.ceil(values.length / setsPerRow);
    const height = worksheet.getRow(templateRow.rowNumber).height;
    // exceljs の spliceRows・duplicateRow は結合セルを動かさないため、
    // この行の横方向の結合と、この行より下の結合をいったん外し、行を増減した後に付け直す
    const merges = worksheet.model.merges.map(parseRange);
    const rowMerges = merges.filter((range) =>
      range.top === templateRow.rowNumber &&
      range.bottom === templateRow.rowNumber
    );
    const lowerMerges = merges.filter((range) => range.top > templateRow.rowNumber);
    for (const merge of [...rowMerges, ...lowerMerges]) {
      worksheet.unMergeCells(formatRange(merge));
    }

    if (requiredRows === 0) {
      worksheet.spliceRows(templateRow.rowNumber, 1);
      restoreShiftedMerges(worksheet, lowerMerges, -1);
      continue;
    }
    if (requiredRows > 1) {
      worksheet.duplicateRow(templateRow.rowNumber, requiredRows - 1, true);
    }
    for (let offset = 0; offset < requiredRows; offset += 1) {
      worksheet.getRow(templateRow.rowNumber + offset).height = height;
      restoreShiftedMerges(worksheet, rowMerges, offset);
    }
    restoreShiftedMerges(worksheet, lowerMerges, requiredRows - 1);

    for (let offset = 0; offset < requiredRows; offset += 1) {
      fillRepeatingRow(
        worksheet,
        templateRow.rowNumber + offset,
        singles,
        templateRow.group,
        values.slice(offset * setsPerRow, (offset + 1) * setsPerRow)
      );
    }
  }

  worksheet.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (isMergedChild(cell)) return;
      const text = textValue(cell.value);
      if (text !== null) cell.value = replaceMarkers(text, singles);
    });
  });
}

function fillRepeatingRow(
  worksheet: Worksheet,
  rowNumber: number,
  singles: SkillSheetMarkerValues,
  group: RepeatingMarkerGroup,
  sets: SkillSheetMarkerValues[]
) {
  let setIndex = 0;
  const seen = new Set<string>();
  worksheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell) => {
    if (isMergedChild(cell)) return;
    const text = textValue(cell.value);
    if (text === null) return;
    for (const marker of extractMarkers(text)) {
      if (!marker.name.startsWith(`${group}.`)) continue;
      if (seen.has(marker.name)) {
        setIndex += 1;
        seen.clear();
      }
      seen.add(marker.name);
    }
    cell.value = replaceMarkers(text, {
      ...singles,
      ...(sets[setIndex] ?? {})
    });
  });
}

function readRows(worksheet: Worksheet) {
  return Array.from({ length: worksheet.rowCount }, (_, index) => {
    const row = worksheet.getRow(index + 1);
    return Array.from({ length: worksheet.columnCount }, (_unused, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      return isMergedChild(cell) ? "" : textValue(cell.value) ?? "";
    });
  });
}

// 結合セルの左上以外のセルは、exceljs では左上の値を返すため、印を二重に数えないよう飛ばす
function isMergedChild(cell: Cell) {
  return cell.isMerged && cell.master.address !== cell.address;
}

function textValue(value: CellValue): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  return null;
}

function parseRange(value: string) {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/u.exec(value);
  if (!match) return { left: 1, top: -1, right: 1, bottom: -1 };
  return {
    left: columnNumber(match[1]),
    top: Number(match[2]),
    right: columnNumber(match[3]),
    bottom: Number(match[4])
  };
}

function formatRange(range: { left: number; top: number; right: number; bottom: number }) {
  return `${columnName(range.left)}${range.top}:${columnName(range.right)}${range.bottom}`;
}

function restoreShiftedMerges(
  worksheet: Worksheet,
  ranges: Array<{ left: number; top: number; right: number; bottom: number }>,
  offset: number
) {
  for (const range of ranges) {
    worksheet.mergeCells(formatRange({
      ...range,
      top: range.top + offset,
      bottom: range.bottom + offset
    }));
  }
}

function columnNumber(value: string) {
  return [...value].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
}

function columnName(value: number) {
  let result = "";
  for (let current = value; current > 0; current = Math.floor((current - 1) / 26)) {
    result = String.fromCharCode(((current - 1) % 26) + 65) + result;
  }
  return result;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
