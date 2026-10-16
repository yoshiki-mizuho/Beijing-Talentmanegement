import { describe, expect, it } from "vitest";
import { escapeCsv } from "./audit-csv";

describe("escapeCsv", () => {
  it.each(["=SUM(A1:A2)", "+1", "-1", "@cmd"])(
    "数式文字 %s を無効化する",
    (value) => expect(escapeCsv(value)).toBe(`"'${value}"`),
  );
  it("カンマ・改行・引用符をエスケープする", () =>
    expect(escapeCsv('a,b\n"c"')).toBe('"a,b\n""c"""'));
});
