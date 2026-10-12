import { describe, expect, it } from "vitest";

import { filterComboboxOptions, type ComboboxOption } from "@/shared/ui/combobox-filter";

const options: ComboboxOption[] = [
  { value: "react", label: "React", group: "フレームワーク" },
  { value: "vue", label: "Vue.js", group: "フレームワーク" },
  { value: "typescript", label: "TypeScript", group: "言語" },
  { value: "aws", label: "ＡＷＳ", group: "クラウド" }
];

describe("filterComboboxOptions", () => {
  it("空の入力では全件を元の順で返す", () => {
    expect(filterComboboxOptions(options, "")).toEqual(options);
  });

  it("大文字と小文字を区別せずに絞り込む", () => {
    expect(filterComboboxOptions(options, "TYPE")).toEqual([options[2]]);
  });

  it("全角と半角を区別せずに絞り込む", () => {
    expect(filterComboboxOptions(options, "aws")).toEqual([options[3]]);
  });

  it("グループ名に一致する候補を元の順で返す", () => {
    expect(filterComboboxOptions(options, "フレームワーク")).toEqual([options[0], options[1]]);
  });

  it("該当する候補がない場合は空の配列を返す", () => {
    expect(filterComboboxOptions(options, "データベース")).toEqual([]);
  });
});
