import { describe, expect, it } from "vitest";
import {
  countRepeatingSets,
  extractMarkers,
  inspectMarkerRows,
  repeatingGroupForRow,
  replaceMarkers
} from "./skill-sheet-markers";

describe("skill sheet markers", () => {
  it("空白付きと文章中の印を読む", () => {
    expect(extractMarkers("氏名: {{ 氏名 }} / {{IT経験年数}}").map((item) => item.name)).toEqual([
      "氏名",
      "IT経験年数"
    ]);
  });

  it("知らない印を一覧にし、複数グループの行をエラーにする", () => {
    const result = inspectMarkerRows([["{{最寄駅}}"], ["{{経歴.期間}}", "{{スキル.名前}}"]]);
    expect(result.unknown).toEqual(["{{最寄駅}}"]);
    expect(result.errors).toHaveLength(1);
  });

  it("1回だけの {{資格}} は繰り返しの行にしない", () => {
    expect(repeatingGroupForRow(["{{資格}}"])).toBeNull();
    expect(repeatingGroupForRow(["{{資格.名前}}"])).toBe("資格");
    expect(inspectMarkerRows([["{{資格}}", "{{経歴.期間}}"]]).errors).toHaveLength(0);
  });

  it("同じ項目の再登場を次の組として数える", () => {
    expect(countRepeatingSets([
      "{{スキル.名前}}",
      "{{スキル.レベル}}",
      "{{スキル.名前}}",
      "{{スキル.レベル}}"
    ], "スキル")).toBe(2);
  });

  it("知らない印を空にする", () => {
    expect(replaceMarkers("{{氏名}} {{最寄駅}}", { 氏名: "田中" })).toBe("田中 ");
  });
});
