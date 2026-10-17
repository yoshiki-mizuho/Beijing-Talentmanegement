export const MAX_CSV_BYTES = 1024 * 1024;
export const MAX_CSV_ROWS = 5000;

export type ParsedCsvRow = {
  line: number;
  values: string[];
};

export type ParsedCsv = {
  headers: string[];
  rows: ParsedCsvRow[];
  encoding: "utf-8" | "shift_jis";
};

export class CsvParseError extends Error {}

export function decodeCsv(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_CSV_BYTES) {
    throw new CsvParseError("ファイルは1MB以下にしてください");
  }
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      encoding: "utf-8" as const,
    };
  } catch {
    return {
      text: new TextDecoder("shift_jis").decode(bytes),
      encoding: "shift_jis" as const,
    };
  }
}

export function parseCsvBytes(bytes: Uint8Array): ParsedCsv {
  const decoded = decodeCsv(bytes);
  const rows = parseCsvText(decoded.text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) {
    throw new CsvParseError("CSVに列名がありません");
  }
  if (rows.length - 1 > MAX_CSV_ROWS) {
    throw new CsvParseError("CSVは5,000行以下にしてください");
  }
  return {
    headers: rows[0].values.map(normalizeCsvValue),
    rows: rows.slice(1).map((row) => ({
      ...row,
      values: row.values.map(normalizeCsvValue),
    })),
    encoding: decoded.encoding,
  };
}

export function parseCsvText(text: string): ParsedCsvRow[] {
  const rows: ParsedCsvRow[] = [];
  let values: string[] = [];
  let value = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
        if (character === "\n") {
          line += 1;
        }
      }
      continue;
    }
    if (character === '"' && value.length === 0) {
      quoted = true;
      continue;
    }
    if (character === ",") {
      values.push(value);
      value = "";
      continue;
    }
    if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      values.push(value);
      if (values.some((item) => item.trim() !== "")) {
        rows.push({ line: rowLine, values });
      }
      values = [];
      value = "";
      line += 1;
      rowLine = line;
      continue;
    }
    value += character;
  }
  if (quoted) {
    throw new CsvParseError("ダブルクォートが閉じられていません");
  }
  values.push(value);
  if (values.some((item) => item.trim() !== "")) {
    rows.push({ line: rowLine, values });
  }
  return rows;
}

export function normalizeCsvValue(value: string) {
  const trimmed = value.trim();
  return /^'[=+\-@]/.test(trimmed) ? trimmed.slice(1) : trimmed;
}
