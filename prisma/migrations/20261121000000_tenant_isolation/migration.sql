-- Add tenant ownership to every tenant-scoped table.
-- The default reads the tenant set by the application in the same transaction.
-- Without it the default is NULL and NOT NULL rejects the row.
ALTER TABLE "User" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "User" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "User" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Department" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "Department" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "Department" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Member" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "Member" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "Member" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "MemberProjectHistory" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "MemberProjectHistory" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "MemberProjectHistory" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "MemberCertification" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "MemberCertification" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "MemberCertification" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillCategory" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillCategory" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillCategory" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillCategoryGroup" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillCategoryGroup" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillCategoryGroup" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Skill" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "Skill" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "Skill" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "TeamGoal" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "TeamGoal" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "TeamGoal" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "TeamGoalAcknowledgement" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "TeamGoalAcknowledgement" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "TeamGoalAcknowledgement" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillPrerequisite" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillPrerequisite" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillPrerequisite" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillLevelGuide" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillLevelGuide" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillLevelGuide" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "MemberSkill" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "MemberSkill" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "MemberSkill" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillSelfAssessment" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillSelfAssessment" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillSelfAssessment" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Notification" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "Notification" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "Notification" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Role" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "Role" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "Role" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "RoleAchievement" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "RoleAchievement" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "RoleAchievement" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillLevelChange" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillLevelChange" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillLevelChange" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "LevelUpReaction" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "LevelUpReaction" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "LevelUpReaction" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "LevelUpComment" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "LevelUpComment" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "LevelUpComment" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "Cheer" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "Cheer" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "Cheer" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "OneOnOneNote" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "OneOnOneNote" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "OneOnOneNote" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "RoleRequirement" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "RoleRequirement" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "RoleRequirement" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "AuditLog" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "AuditLog" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "CsvImportJob" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "CsvImportJob" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "CsvImportJob" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "GrowthHint" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "GrowthHint" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "GrowthHint" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "ProposalSheetDraft" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "ProposalSheetDraft" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "ProposalSheetDraft" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "SkillSheetTemplate" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "SkillSheetTemplate" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "SkillSheetTemplate" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "AiUsageLog" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "AiUsageLog" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('app.tenant_id', true)::uuid;
ALTER TABLE "AiUsageLog" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Make business identifiers unique within a tenant.
DROP INDEX "User_platformUserId_key";
DROP INDEX "User_memberId_key";
DROP INDEX "Department_code_key";
DROP INDEX "Member_employeeNo_key";
DROP INDEX "Member_email_key";
DROP INDEX "SkillCategory_name_key";
DROP INDEX "SkillCategoryGroup_name_key";
DROP INDEX "Skill_code_key";
DROP INDEX "Skill_categoryId_name_key";
DROP INDEX "TeamGoalAcknowledgement_teamGoalId_memberId_key";
DROP INDEX "SkillPrerequisite_skillId_prerequisiteSkillId_key";
DROP INDEX "SkillLevelGuide_skillId_level_key";
DROP INDEX "MemberSkill_memberId_skillId_key";
DROP INDEX "Role_code_key";
DROP INDEX "Role_name_key";
DROP INDEX "RoleAchievement_memberId_roleId_key";
DROP INDEX "LevelUpReaction_levelChangeId_memberId_type_key";
DROP INDEX "RoleRequirement_roleId_skillId_key";
DROP INDEX "SkillSheetTemplate_name_key";

CREATE UNIQUE INDEX "User_tenant_id_platformUserId_key" ON "User"("tenant_id", "platformUserId");
CREATE UNIQUE INDEX "User_tenant_id_memberId_key" ON "User"("tenant_id", "memberId");
CREATE UNIQUE INDEX "Department_tenant_id_code_key" ON "Department"("tenant_id", "code");
CREATE UNIQUE INDEX "Member_tenant_id_employeeNo_key" ON "Member"("tenant_id", "employeeNo");
CREATE UNIQUE INDEX "Member_tenant_id_email_key" ON "Member"("tenant_id", "email");
CREATE UNIQUE INDEX "SkillCategory_tenant_id_name_key" ON "SkillCategory"("tenant_id", "name");
CREATE UNIQUE INDEX "SkillCategoryGroup_tenant_id_name_key" ON "SkillCategoryGroup"("tenant_id", "name");
CREATE UNIQUE INDEX "Skill_tenant_id_code_key" ON "Skill"("tenant_id", "code");
CREATE UNIQUE INDEX "Skill_tenant_id_categoryId_name_key" ON "Skill"("tenant_id", "categoryId", "name");
CREATE UNIQUE INDEX "TeamGoalAcknowledgement_tenant_id_teamGoalId_memberId_key" ON "TeamGoalAcknowledgement"("tenant_id", "teamGoalId", "memberId");
CREATE UNIQUE INDEX "SkillPrerequisite_tenant_id_skillId_prerequisiteSkillId_key" ON "SkillPrerequisite"("tenant_id", "skillId", "prerequisiteSkillId");
CREATE UNIQUE INDEX "SkillLevelGuide_tenant_id_skillId_level_key" ON "SkillLevelGuide"("tenant_id", "skillId", "level");
CREATE UNIQUE INDEX "MemberSkill_tenant_id_memberId_skillId_key" ON "MemberSkill"("tenant_id", "memberId", "skillId");
CREATE UNIQUE INDEX "Role_tenant_id_code_key" ON "Role"("tenant_id", "code");
CREATE UNIQUE INDEX "Role_tenant_id_name_key" ON "Role"("tenant_id", "name");
CREATE UNIQUE INDEX "RoleAchievement_tenant_id_memberId_roleId_key" ON "RoleAchievement"("tenant_id", "memberId", "roleId");
CREATE UNIQUE INDEX "LevelUpReaction_tenant_id_levelChangeId_memberId_type_key" ON "LevelUpReaction"("tenant_id", "levelChangeId", "memberId", "type");
CREATE UNIQUE INDEX "RoleRequirement_tenant_id_roleId_skillId_key" ON "RoleRequirement"("tenant_id", "roleId", "skillId");
CREATE UNIQUE INDEX "SkillSheetTemplate_tenant_id_name_key" ON "SkillSheetTemplate"("tenant_id", "name");

CREATE INDEX "MemberProjectHistory_tenant_id_idx" ON "MemberProjectHistory"("tenant_id");
CREATE INDEX "MemberCertification_tenant_id_idx" ON "MemberCertification"("tenant_id");
CREATE INDEX "TeamGoal_tenant_id_idx" ON "TeamGoal"("tenant_id");
CREATE INDEX "SkillSelfAssessment_tenant_id_idx" ON "SkillSelfAssessment"("tenant_id");
CREATE INDEX "Notification_tenant_id_idx" ON "Notification"("tenant_id");
CREATE INDEX "SkillLevelChange_tenant_id_idx" ON "SkillLevelChange"("tenant_id");
CREATE INDEX "LevelUpComment_tenant_id_idx" ON "LevelUpComment"("tenant_id");
CREATE INDEX "Cheer_tenant_id_idx" ON "Cheer"("tenant_id");
CREATE INDEX "OneOnOneNote_tenant_id_idx" ON "OneOnOneNote"("tenant_id");
CREATE INDEX "AuditLog_tenant_id_idx" ON "AuditLog"("tenant_id");
CREATE INDEX "CsvImportJob_tenant_id_idx" ON "CsvImportJob"("tenant_id");
CREATE INDEX "GrowthHint_tenant_id_idx" ON "GrowthHint"("tenant_id");
CREATE INDEX "ProposalSheetDraft_tenant_id_idx" ON "ProposalSheetDraft"("tenant_id");
CREATE INDEX "AiUsageLog_tenant_id_idx" ON "AiUsageLog"("tenant_id");

-- Apply fail-closed row-level security. SkillLevel is shared and read-only.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User', 'Department', 'Member', 'MemberProjectHistory',
    'MemberCertification', 'SkillCategory', 'SkillCategoryGroup', 'Skill',
    'TeamGoal', 'TeamGoalAcknowledgement', 'SkillPrerequisite',
    'SkillLevelGuide', 'MemberSkill', 'SkillSelfAssessment', 'Notification',
    'Role', 'RoleAchievement', 'SkillLevelChange', 'LevelUpReaction',
    'LevelUpComment', 'Cheer', 'OneOnOneNote', 'RoleRequirement', 'AuditLog',
    'CsvImportJob', 'GrowthHint', 'ProposalSheetDraft', 'SkillSheetTemplate',
    'AiUsageLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      table_name
    );
  END LOOP;
END
$$;
