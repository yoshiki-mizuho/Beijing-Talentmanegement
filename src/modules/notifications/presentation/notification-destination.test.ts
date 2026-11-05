import { AuthRole, NotificationType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getNotificationDestination } from "./notification-destination";

describe("getNotificationDestination", () => {
  it.each([AuthRole.ADMIN, AuthRole.MANAGER])(
    "%sのスキル申告依頼は承認画面へ遷移する",
    (role) => {
      expect(
        getNotificationDestination({
          type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
          role,
          skillSelfAssessmentId: "assessment-1",
          skillLevelChangeId: null
        })
      ).toBe("/skill-approvals");
    }
  );

  it("MEMBERのスキル申告依頼は権限外画面へ遷移しない", () => {
    expect(
      getNotificationDestination({
        type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: "assessment-1",
        skillLevelChangeId: null
      })
    ).toBeNull();
  });

  it.each([
    NotificationType.SKILL_ASSESSMENT_APPROVED,
    NotificationType.SKILL_ASSESSMENT_CORRECTED
  ])("申告結果 %s は自分のスキル画面へ遷移する", (type) => {
    expect(
      getNotificationDestination({
        type,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: "assessment-1",
        skillLevelChangeId: null
      })
    ).toBe("/my/skills");
  });

  it("差し戻し結果は申告履歴へ遷移する", () => {
    expect(
      getNotificationDestination({
        type: NotificationType.SKILL_ASSESSMENT_REJECTED,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: "assessment-1",
        skillLevelChangeId: null
      })
    ).toBe("/my/skills?tab=history");
  });

  it("関連データがない通知は通知一覧に留まる", () => {
    expect(
      getNotificationDestination({
        type: NotificationType.SKILL_ASSESSMENT_APPROVED,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: null,
        skillLevelChangeId: null
      })
    ).toBeNull();
  });

  it.each([
    NotificationType.LEVEL_UP_COMMENTED,
    NotificationType.LEVEL_UP_REACTED
  ])("レベルアップ通知 %s は専用画面へ遷移する", (type) => {
    expect(getNotificationDestination({
      type,
      role: AuthRole.MEMBER,
      skillSelfAssessmentId: null,
      skillLevelChangeId: "change-1"
    })).toBe("/level-ups/change-1");
  });
});
