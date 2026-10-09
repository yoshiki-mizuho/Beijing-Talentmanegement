import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  levelChangeFind: vi.fn(),
  commentCreate: vi.fn(),
  notificationCreate: vi.fn(),
  noteFindMany: vi.fn(),
  noteUpdateMany: vi.fn(),
  noteFindFirstOrThrow: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    oneOnOneNote: {
      findMany: mocks.noteFindMany,
      updateMany: mocks.noteUpdateMany,
      findFirstOrThrow: mocks.noteFindFirstOrThrow
    }
  }
}));

import {
  createLevelUpComment,
  listOneOnOneNotes,
  updateOneOnOneNote
} from "@/modules/growth/infrastructure/growth-repository";

const transactionClient = {
  skillLevelChange: { findUniqueOrThrow: mocks.levelChangeFind },
  levelUpComment: { create: mocks.commentCreate },
  notification: { create: mocks.notificationCreate }
};

describe("growth repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.commentCreate.mockResolvedValue({ id: "comment-1" });
  });

  it("does not notify a member about their own level-up comment", async () => {
    mocks.levelChangeFind.mockResolvedValue({
      id: "change-1",
      memberId: "member-1",
      toLevel: 3,
      skill: { name: "TypeScript" }
    });

    await createLevelUpComment({
      levelChangeId: "change-1",
      authorMemberId: "member-1",
      body: "振り返り"
    });

    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("notifies the member when another member comments", async () => {
    mocks.levelChangeFind.mockResolvedValue({
      id: "change-1",
      memberId: "member-1",
      toLevel: 3,
      skill: { name: "TypeScript" }
    });

    await createLevelUpComment({
      levelChangeId: "change-1",
      authorMemberId: "member-2",
      body: "おめでとう"
    });

    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientMemberId: "member-1",
        skillLevelChangeId: "change-1"
      })
    });
  });

  it("always scopes one-on-one note listing and updates to the author", async () => {
    mocks.noteFindMany.mockResolvedValue([]);
    mocks.noteUpdateMany.mockResolvedValue({ count: 1 });
    mocks.noteFindFirstOrThrow.mockResolvedValue({ id: "note-1" });

    await listOneOnOneNotes("manager-1", "member-1");
    await updateOneOnOneNote({
      id: "note-1",
      managerMemberId: "manager-1",
      body: "次回の話題"
    });

    expect(mocks.noteFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { managerMemberId: "manager-1", memberId: "member-1" }
    }));
    expect(mocks.noteUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "note-1", managerMemberId: "manager-1" }
    }));
  });

  it("rejects an update when the scoped note is not found", async () => {
    mocks.noteUpdateMany.mockResolvedValue({ count: 0 });

    await expect(updateOneOnOneNote({
      id: "note-1",
      managerMemberId: "other-manager",
      body: "見えてはいけない"
    })).rejects.toThrow("この1on1メモを更新する権限がありません。");
  });
});
