import { NotificationType } from "@prisma/client";

import {
  canAccessAppPath,
  type AppRole
} from "@/shared/auth/app-access";

type NotificationDestination = "/skill-approvals" | "/my/skills";

type NotificationDestinationInput = {
  type: NotificationType;
  role: AppRole;
  skillSelfAssessmentId: string | null;
};

export function getNotificationDestination({
  type,
  role,
  skillSelfAssessmentId
}: NotificationDestinationInput): NotificationDestination | null {
  if (!skillSelfAssessmentId) {
    return null;
  }

  let destination: NotificationDestination | null = null;

  if (type === NotificationType.SKILL_ASSESSMENT_REQUESTED) {
    destination = "/skill-approvals";
  } else if (
    type === NotificationType.SKILL_ASSESSMENT_APPROVED ||
    type === NotificationType.SKILL_ASSESSMENT_CORRECTED ||
    type === NotificationType.SKILL_ASSESSMENT_REJECTED
  ) {
    destination = "/my/skills";
  }

  return destination && canAccessAppPath(role, destination) ? destination : null;
}
