import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditLogQuery } from "../domain/audit-log-query";

const db = vi.hoisted(() => ({
  member: { findMany: vi.fn() },
  department: { findMany: vi.fn() },
  skill: { findMany: vi.fn() },
  skillCategory: { findMany: vi.fn() },
  role: { findMany: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: db }));

import { buildAuditLogWhere } from "./audit-log-query-repository";

function query(overrides: Partial<AuditLogQuery> = {}): AuditLogQuery {
  return {
    period: "custom",
    from: new Date("2026-10-01T00:00:00.000Z"),
    to: new Date("2026-10-02T23:59:59.999Z"),
    fromDate: "2026-10-01",
    toDate: "2026-10-02",
    targets: [],
    operations: [],
    q: "",
    page: 1,
    ...overrides,
  };
}

describe("buildAuditLogWhere", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.member.findMany.mockResolvedValue([]);
    db.department.findMany.mockResolvedValue([]);
    db.skill.findMany.mockResolvedValue([]);
    db.skillCategory.findMany.mockResolvedValue([]);
    db.role.findMany.mockResolvedValue([]);
  });

  it("期間と操作した人を条件にする", async () => {
    const input = query({ actor: "member-1" });
    await expect(buildAuditLogWhere(input)).resolves.toMatchObject({
      occurredAt: { gte: input.from, lte: input.to },
      actorMemberId: "member-1",
    });
  });

  it("対象グループをtargetTypeへ展開する", async () => {
    const where = await buildAuditLogWhere(
      query({ targets: ["member", "assessment"] }),
    );
    expect(where.targetType).toEqual({
      in: ["Member", "MemberSkill", "SkillSelfAssessment", "Department"],
    });
  });

  it("CSV 対象に通常 CSV と監査ログの出力を含める", async () => {
    const where = await buildAuditLogWhere(query({ targets: ["csv"] }));
    expect(where.targetType).toEqual({ in: ["AuditLog", "Csv"] });
  });

  it("操作種別を監査アクション定数へ展開する", async () => {
    const where = await buildAuditLogWhere(
      query({ operations: ["approve", "delete"] }),
    );
    expect(where.action).toEqual({
      in: [
        "member_skill.delete",
        "skill_assessment.approve",
        "skill.delete",
        "skill_category.delete",
        "role.delete",
        "role.requirement.remove",
      ],
    });
  });

  it("名称候補ID、metadata参照、削除前名称をOR条件にする", async () => {
    db.member.findMany.mockResolvedValue([{ id: "member-1" }]);
    db.department.findMany.mockResolvedValue([{ id: "department-1" }]);
    db.skill.findMany.mockResolvedValue([{ id: "skill-1" }]);
    db.skillCategory.findMany.mockResolvedValue([{ id: "category-1" }]);
    db.role.findMany.mockResolvedValue([{ id: "role-1" }]);

    const where = await buildAuditLogWhere(query({ q: "検索" }));

    expect(db.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(db.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(db.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(db.skillCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(db.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(where.OR).toEqual([
      {
        targetId: {
          in: [
            "member-1",
            "department-1",
            "skill-1",
            "category-1",
            "role-1",
          ],
        },
      },
      { metadata: { path: ["memberId"], equals: "member-1" } },
      { metadata: { path: ["skillId"], equals: "skill-1" } },
      { before: { path: ["name"], string_contains: "検索" } },
    ]);
  });
});
