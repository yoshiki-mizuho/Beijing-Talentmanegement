import { describe, expect, it } from "vitest";

import {
  cheerInputSchema,
  levelUpCommentInputSchema,
  oneOnOneNoteInputSchema
} from "@/modules/growth/domain/growth-schema";

describe("growth text length validation", () => {
  it("allows a 200 character comment and rejects 201 characters", () => {
    const base = { levelChangeId: "change", authorMemberId: "author" };
    expect(levelUpCommentInputSchema.safeParse({ ...base, body: "あ".repeat(200) }).success).toBe(true);
    expect(levelUpCommentInputSchema.safeParse({ ...base, body: "あ".repeat(201) }).success).toBe(false);
  });

  it("allows 500 character cheers and notes and rejects 501 characters", () => {
    expect(cheerInputSchema.safeParse({
      fromMemberId: "from",
      toMemberId: "to",
      message: "応".repeat(500)
    }).success).toBe(true);
    expect(cheerInputSchema.safeParse({
      fromMemberId: "from",
      toMemberId: "to",
      message: "応".repeat(501)
    }).success).toBe(false);
    expect(oneOnOneNoteInputSchema.safeParse({
      managerMemberId: "manager",
      memberId: "member",
      body: "話".repeat(501)
    }).success).toBe(false);
  });
});
