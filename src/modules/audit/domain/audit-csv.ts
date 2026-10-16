export function escapeCsv(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function buildCsv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}
