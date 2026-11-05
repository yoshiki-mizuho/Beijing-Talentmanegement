import type { NotificationType } from "@prisma/client";

import {
  canAccessAppPath,
  type AppRole
} from "@/shared/auth/app-access";

type NotificationDestination =
  | "/skill-approvals"
  | "/my/skills"
  | "/my/skills?tab=history"
  | `/level-ups/${string}`;

type NotificationDestinationInput = {
  type: NotificationType;
  role: AppRole;
  skillSelfAssessmentId: string | null;
  skillLevelChangeId: string | null;
};

export function getNotificationDestination({
  type,
  role,
  skillSelfAssessmentId,
  skillLevelChangeId
}: NotificationDestinationInput): NotificationDestination | null {
  if (type === "LEVEL_UP_COMMENTED" || type === "LEVEL_UP_REACTED") {
    const destination = skillLevelChangeId
      ? `/level-ups/${encodeURIComponent(skillLevelChangeId)}` as const
      : null;
    return destination && canAccessAppPath(role, destination) ? destination : null;
  }

  if (!skillSelfAssessmentId) return null;

  let destination: NotificationDestination | null = null;

  if (type === "SKILL_ASSESSMENT_REQUESTED") {
    destination = "/skill-approvals";
  } else if (
    type === "SKILL_ASSESSMENT_APPROVED" ||
    type === "SKILL_ASSESSMENT_CORRECTED"
  ) {
    destination = "/my/skills";
  } else if (type === "SKILL_ASSESSMENT_REJECTED") {
    destination = "/my/skills?tab=history";
  }

  const accessPath = destination?.split("?")[0] ?? null;
  return destination && accessPath && canAccessAppPath(role, accessPath)
    ? destination
    : null;
}
