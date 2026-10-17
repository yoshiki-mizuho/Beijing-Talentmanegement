import { describe, expect, it } from "vitest";
import {
  buildActionDescription,
  buildAuditSummary,
  buildDiffRows,
  displayValue,
  fieldLabel,
  resolveAuditTargetName,
} from "./audit-log-display";

describe("audit log display", () => {
  it("項目と値を日本語化する", () => {
    expect(fieldLabel("employeeNo")).toBe("社員番号");
    expect(displayValue("status", "ACTIVE")).toBe("在籍中");
    expect(displayValue("isRequired", false)).toBe("任意");
    expect(fieldLabel("role")).toBe("権限");
    expect(displayValue("role", "MANAGER")).toBe("マネージャー");
    expect(
      displayValue("departmentId", "d1", { departments: { d1: "開発部" } }),
    ).toBe("開発部");
  });

  it("権限変更の文と要約を組み立てる", () => {
    const input = {
      action: "member.role.update",
      targetType: "Member",
      targetName: "山田 花子",
      before: { role: "MEMBER" },
      after: { role: "MANAGER" },
      metadata: { changedFields: ["role"] },
    };
    expect(buildActionDescription(input).suffix).toBe(" の権限を変更");
    expect(buildAuditSummary(input)).toBe("メンバー → マネージャー");
  });
  it("差分と伏せた項目を行にする", () => {
    const rows = buildDiffRows(
      { level: 3 },
      { level: 4 },
      { changedFields: ["level", "profile"] },
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "レベル",
          before: "Lv3",
          after: "Lv4",
        }),
        expect.objectContaining({ label: "自己紹介", redacted: true }),
      ]),
    );
  });

  it.each([
    ["member.create", "Member", "山田 花子", "", "山田 花子", " を作成"],
    ["skill.delete", "Skill", "React", "スキル ", "React", " を削除"],
    [
      "skill_category.update",
      "SkillCategory",
      "開発",
      "カテゴリ ",
      "開発",
      " を更新",
    ],
    ["role.deactivate", "Role", "リード", "ロール ", "リード", " を無効化"],
  ])(
    "対象の種類を含む基本操作の文を組み立てる",
    (action, targetType, targetName, prefix, target, suffix) => {
      expect(
        buildActionDescription({
          action,
          targetType,
          targetName,
          before: null,
          after: null,
          metadata: null,
        }),
      ).toEqual({ prefix, target, suffix });
    },
  );

  it("特殊な操作の文を組み立てる", () => {
    const base = {
      targetType: "Skill",
      targetName: "React",
      before: null,
      after: null,
      metadata: null,
    };
    expect(
      buildActionDescription({
        ...base,
        action: "skill.level_guides.update",
      }).suffix,
    ).toBe(" のレベルの目安を更新");
    expect(
      buildActionDescription({
        ...base,
        action: "role.requirement.set",
        targetType: "Role",
        targetName: "リード",
        skillName: "React",
      }),
    ).toEqual({
      prefix: "ロール ",
      target: "リード",
      suffix: " の要件（React）を設定",
    });
    expect(
      buildActionDescription({
        ...base,
        action: "member.manager.update",
        targetName: "山田 花子",
      }).suffix,
    ).toBe(" の上司を変更");
  });

  it("本人の申請ではメンバー名を省き、代理申請では表示する", () => {
    const base = {
      action: "skill_assessment.create",
      targetType: "SkillSelfAssessment",
      targetName: "山田 花子 の React",
      skillName: "React",
      memberId: "member-1",
      before: null,
      after: null,
      metadata: null,
    };
    expect(
      buildActionDescription({ ...base, actorMemberId: "member-1" }).target,
    ).toBe("React");
    expect(
      buildActionDescription({ ...base, actorMemberId: "admin-1" }).target,
    ).toBe("山田 花子 の React");
  });

  it("action ごとの要約を組み立てる", () => {
    const base = {
      targetType: "MemberSkill",
      targetName: "山田 花子 の React",
      metadata: null,
    };
    expect(
      buildAuditSummary({
        ...base,
        action: "member_skill.update",
        before: { level: 2 },
        after: { level: 3 },
      }),
    ).toBe("Lv2 → Lv3");
    expect(
      buildAuditSummary({
        ...base,
        action: "member_skill.delete",
        before: { level: 3 },
        after: null,
      }),
    ).toBe("Lv3 を削除");
    expect(
      buildAuditSummary({
        ...base,
        action: "skill_assessment.correct",
        before: null,
        after: null,
        metadata: { requestedLevel: 3, approvedLevel: 4 },
      }),
    ).toBe("Lv3 → Lv4");
    expect(
      buildAuditSummary({
        ...base,
        action: "role.requirement.set",
        before: { requiredLevel: 2, isRequired: false },
        after: { requiredLevel: 3, isRequired: true },
      }),
    ).toBe("Lv2 → Lv3・任意 → 必須");
  });

  it("作成、削除、レベルの目安、CSV 出力の要約を組み立てる", () => {
    const base = {
      targetType: "Skill",
      targetName: "React",
      before: null,
      metadata: null,
    };
    expect(
      buildAuditSummary({
        ...base,
        action: "skill.create",
        after: { categoryId: "category-1" },
        names: { categories: { "category-1": "開発" } },
      }),
    ).toBe("カテゴリ：開発");
    expect(
      buildAuditSummary({
        ...base,
        action: "skill.delete",
        after: null,
      }),
    ).toBe("");
    expect(
      buildAuditSummary({
        ...base,
        action: "skill.level_guides.update",
        after: null,
        diffRows: [
          { field: "3", label: "レベルの目安 Lv3" },
          { field: "4", label: "レベルの目安 Lv4" },
        ],
      }),
    ).toBe("Lv3・Lv4");
    expect(
      buildAuditSummary({
        ...base,
        action: "audit_log.export",
        after: null,
        metadata: { count: 24 },
      }),
    ).toBe("24件");
  });

  it("CSV 出力の文と要約を組み立てる", () => {
    const input = {
      action: "csv.export",
      targetType: "Csv",
      targetName: "（削除済み）",
      before: null,
      after: null,
      metadata: { target: "members", scope: "active", count: 42 },
    };
    expect(buildActionDescription(input)).toEqual({
      prefix: "",
      target: "メンバー",
      suffix: " の CSV を出力",
    });
    expect(buildAuditSummary(input)).toBe("42件");
  });

  it("CSV 取り込みの文と要約を組み立てる", () => {
    const input = {
      action: "csv.import",
      targetType: "Csv",
      targetName: "（削除済み）",
      before: null,
      after: null,
      metadata: { target: "departments", created: 12, updated: 3 },
    };
    expect(buildActionDescription(input)).toEqual({
      prefix: "",
      target: "部署",
      suffix: " の CSV を取り込み",
    });
    expect(buildAuditSummary(input)).toBe("新規 12件・更新 3件");
  });

  it("削除済み対象は記録時の名前を使い、複合対象はメンバー名とスキル名を使う", () => {
    const base = {
      targetId: "deleted-1",
      memberId: "member-1",
      skillId: "skill-1",
      names: {
        members: { "member-1": "山田 花子" },
        skills: { "skill-1": "React" },
      },
    };
    expect(
      resolveAuditTargetName({
        ...base,
        targetType: "Skill",
        before: { name: "旧スキル" },
        after: { name: "新スキル" },
      }),
    ).toBe("旧スキル");
    expect(
      resolveAuditTargetName({
        ...base,
        targetType: "Role",
        before: null,
        after: { name: "リード" },
      }),
    ).toBe("リード");
    expect(
      resolveAuditTargetName({
        ...base,
        targetType: "MemberSkill",
        before: null,
        after: null,
      }),
    ).toBe("山田 花子 の React");
  });
  it("承認は承認したレベル、要件の新規設定はレベルと必須を要約する", () => {
    const base = {
      targetType: "Role",
      targetName: "バックエンド",
      before: null,
      after: null,
      metadata: null,
    };
    expect(
      buildAuditSummary({
        ...base,
        action: "skill_assessment.approve",
        metadata: { requestedLevel: 3, approvedLevel: 3 },
      }),
    ).toBe("Lv3");
    expect(
      buildAuditSummary({
        ...base,
        action: "role.requirement.set",
        after: { requiredLevel: 2, isRequired: true },
      }),
    ).toBe("Lv2・必須");
  });

  it("出力の件数を補足の行に出す", () => {
    expect(buildDiffRows(null, null, { count: 32, filters: {} })).toEqual([
      expect.objectContaining({ label: "件数", content: "32" }),
    ]);
  });
});
