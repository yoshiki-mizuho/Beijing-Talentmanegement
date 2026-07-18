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
          skillSelfAssessmentId: "assessment-1"
        })
      ).toBe("/skill-approvals");
    }
  );

  it("MEMBERのスキル申告依頼は権限外画面へ遷移しない", () => {
    expect(
      getNotificationDestination({
        type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: "assessment-1"
      })
    ).toBeNull();
  });

  it.each([
    NotificationType.SKILL_ASSESSMENT_APPROVED,
    NotificationType.SKILL_ASSESSMENT_CORRECTED,
    NotificationType.SKILL_ASSESSMENT_REJECTED
  ])("申告結果 %s は自分のスキル画面へ遷移する", (type) => {
    expect(
      getNotificationDestination({
        type,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: "assessment-1"
      })
    ).toBe("/my/skills");
  });

  it("関連データがない通知は通知一覧に留まる", () => {
    expect(
      getNotificationDestination({
        type: NotificationType.SKILL_ASSESSMENT_APPROVED,
        role: AuthRole.MEMBER,
        skillSelfAssessmentId: null
      })
    ).toBeNull();
  });
});
