import { describe, expect, it } from "vitest";
import { decodeCsv, parseCsvBytes, parseCsvText } from "./csv-parse";

describe("CSV parser", () => {
  it.each(["a,b\r\n1,2\r\n", "a,b\n1,2\n"])("CRLFとLFを解析する", (text) => {
    expect(parseCsvText(text)).toHaveLength(2);
  });

  it("クォート内のカンマ・改行・二重引用符と空行を解析する", () => {
    const rows = parseCsvText('a,b\r\n"x,y","line1\nline2 ""ok"""\r\n\r\n');
    expect(rows[1]).toEqual({ line: 2, values: ["x,y", 'line1\nline2 "ok"'] });
  });

  it("UTF-8 BOMあり・なしを解析し先頭のエスケープを戻す", () => {
    for (const prefix of ["", "\uFEFF"]) {
      const parsed = parseCsvBytes(
        new TextEncoder().encode(`${prefix}a\n'=value\n`),
      );
      expect(parsed.encoding).toBe("utf-8");
      expect(parsed.rows[0].values[0]).toBe("=value");
    }
  });

  it("UTF-8でないバイト列をShift_JISとして読む", () => {
    const decoded = decodeCsv(new Uint8Array([0x82, 0xa0]));
    expect(decoded).toEqual({ text: "あ", encoding: "shift_jis" });
  });
});
