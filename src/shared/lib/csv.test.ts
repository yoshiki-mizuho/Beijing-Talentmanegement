import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsv } from "./csv";

describe("CSV", () => {
  it.each(["=SUM(A1:A2)", "+1", "-1", "@cmd"])(
    "数式文字 %s を無効化する",
    (value) => expect(escapeCsv(value)).toBe(`"'${value}"`),
  );

  it("カンマ・改行・引用符をエスケープする", () => {
    expect(escapeCsv('a,b\n"c"')).toBe('"a,b\n""c"""');
  });

  it("BOM と CRLF を付ける", () => {
    expect(buildCsv(["name"], [["山田"]])).toBe('\uFEFF"name"\r\n"山田"\r\n');
  });
});
