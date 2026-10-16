export const AUDIT_ACTION = {
  MEMBER_CREATE: "member.create",
  MEMBER_UPDATE: "member.update",
  MEMBER_DEACTIVATE: "member.deactivate",
  MEMBER_MANAGER_UPDATE: "member.manager.update",
  MEMBER_TARGET_ROLE_UPDATE: "member.target_role.update",
  MEMBER_SKILL_CREATE: "member_skill.create",
  MEMBER_SKILL_UPDATE: "member_skill.update",
  MEMBER_SKILL_DELETE: "member_skill.delete",
  SKILL_ASSESSMENT_CREATE: "skill_assessment.create",
  SKILL_ASSESSMENT_APPROVE: "skill_assessment.approve",
  SKILL_ASSESSMENT_CORRECT: "skill_assessment.correct",
  SKILL_ASSESSMENT_REJECT: "skill_assessment.reject",
  SKILL_CREATE: "skill.create",
  SKILL_UPDATE: "skill.update",
  SKILL_DEACTIVATE: "skill.deactivate",
  SKILL_DELETE: "skill.delete",
  SKILL_LEVEL_GUIDES_UPDATE: "skill.level_guides.update",
  SKILL_CATEGORY_CREATE: "skill_category.create",
  SKILL_CATEGORY_UPDATE: "skill_category.update",
  SKILL_CATEGORY_DELETE: "skill_category.delete",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DEACTIVATE: "role.deactivate",
  ROLE_DELETE: "role.delete",
  ROLE_REQUIREMENT_SET: "role.requirement.set",
  ROLE_REQUIREMENT_REMOVE: "role.requirement.remove",
  AUDIT_LOG_EXPORT: "audit_log.export",
  CSV_EXPORT: "csv.export",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_TARGET_TYPE = {
  MEMBER: "Member",
  MEMBER_SKILL: "MemberSkill",
  SKILL_SELF_ASSESSMENT: "SkillSelfAssessment",
  SKILL: "Skill",
  SKILL_CATEGORY: "SkillCategory",
  ROLE: "Role",
  AUDIT_LOG: "AuditLog",
  CSV: "Csv",
} as const;

export type AuditTargetType =
  (typeof AUDIT_TARGET_TYPE)[keyof typeof AUDIT_TARGET_TYPE];
