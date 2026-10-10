import { describe, expect, it } from "vitest";

import {
  buildCheerMessage,
  selectMentorCandidates,
  sortOneOnOneNotes
} from "@/modules/growth/domain/cheer-and-one-on-one";

describe("cheer and one-on-one helpers", () => {
  it("応援の文面案を組み立てる", () => {
    expect(buildCheerMessage({ memberName: "佐藤", roleName: "シニア", skillName: "TypeScript", requiredLevel: 4 }))
      .toBe("佐藤さん、シニアまであと一歩ですね。TypeScriptの Lv4 に向けて応援しています！");
  });

  it("紹介候補を在籍・Lv4以上に絞り、除外後にレベル順で5人まで返す", () => {
    const candidates = [
      { id: "self", name: "本人", status: "ACTIVE", level: 5 },
      { id: "a", name: "A", status: "ACTIVE", level: 4 },
      { id: "b", name: "B", status: "ACTIVE", level: 5 },
      { id: "c", name: "C", status: "INACTIVE", level: 5 },
      { id: "d", name: "D", status: "ACTIVE", level: 3 },
      { id: "e", name: "E", status: "ACTIVE", level: 4 },
      { id: "f", name: "F", status: "ACTIVE", level: 4 },
      { id: "g", name: "G", status: "ACTIVE", level: 4 },
      { id: "h", name: "H", status: "ACTIVE", level: 4 }
    ];
    expect(selectMentorCandidates(candidates, ["self"], 5).map((item) => item.id))
      .toEqual(["b", "a", "e", "f", "g"]);
  });

  it("未話題を先にし、それぞれ新しい順に並べる", () => {
    const notes = [
      { id: "old-open", createdAt: "2026-01-01", discussedAt: null },
      { id: "done", createdAt: "2026-03-01", discussedAt: "2026-04-01" },
      { id: "new-open", createdAt: "2026-02-01", discussedAt: null }
    ];
    expect(sortOneOnOneNotes(notes).map((note) => note.id)).toEqual(["new-open", "old-open", "done"]);
  });
});
