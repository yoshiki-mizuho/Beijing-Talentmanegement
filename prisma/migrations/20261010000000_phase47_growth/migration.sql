-- CreateEnum
CREATE TYPE "SkillLevelChangeSource" AS ENUM ('ASSESSMENT_APPROVED', 'ASSESSMENT_CORRECTED', 'DIRECT_EDIT', 'BACKFILL');

-- CreateEnum
CREATE TYPE "LevelUpReactionType" AS ENUM ('CONGRATS', 'AMAZING', 'WANT_TO_LEARN');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEVEL_UP_COMMENTED';
ALTER TYPE "NotificationType" ADD VALUE 'CHEER_RECEIVED';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "managerId" TEXT,
ADD COLUMN "targetRoleId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "skillLevelChangeId" TEXT,
ADD COLUMN "cheerId" TEXT;

-- CreateTable
CREATE TABLE "SkillLevelChange" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "fromLevel" INTEGER,
    "toLevel" INTEGER NOT NULL,
    "source" "SkillLevelChangeSource" NOT NULL,
    "skillSelfAssessmentId" TEXT,
    "changedByMemberId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillLevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelUpReaction" (
    "id" TEXT NOT NULL,
    "levelChangeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "LevelUpReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelUpReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelUpComment" (
    "id" TEXT NOT NULL,
    "levelChangeId" TEXT NOT NULL,
    "authorMemberId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelUpComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cheer" (
    "id" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetSkillId" TEXT,
    "mentorMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cheer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneOnOneNote" (
    "id" TEXT NOT NULL,
    "managerMemberId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "discussedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneOnOneNote_pkey" PRIMARY KEY ("id")
);

-- BackfillData
INSERT INTO "SkillLevelChange" (
    "id",
    "memberId",
    "skillId",
    "fromLevel",
    "toLevel",
    "source",
    "skillSelfAssessmentId",
    "changedByMemberId",
    "changedAt",
    "createdAt"
)
SELECT
    gen_random_uuid()::text,
    "memberId",
    "skillId",
    NULL,
    "level",
    'BACKFILL'::"SkillLevelChangeSource",
    NULL,
    "approvedByMemberId",
    COALESCE("approvedAt", "lastAssessedAt"::timestamp, "createdAt"),
    CURRENT_TIMESTAMP
FROM "MemberSkill";

-- CreateIndex
CREATE INDEX "Member_managerId_idx" ON "Member"("managerId");

-- CreateIndex
CREATE INDEX "Member_targetRoleId_idx" ON "Member"("targetRoleId");

-- CreateIndex
CREATE INDEX "SkillLevelChange_memberId_changedAt_idx" ON "SkillLevelChange"("memberId", "changedAt");

-- CreateIndex
CREATE INDEX "SkillLevelChange_changedAt_idx" ON "SkillLevelChange"("changedAt");

-- CreateIndex
CREATE INDEX "SkillLevelChange_skillSelfAssessmentId_idx" ON "SkillLevelChange"("skillSelfAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelUpReaction_levelChangeId_memberId_type_key" ON "LevelUpReaction"("levelChangeId", "memberId", "type");

-- CreateIndex
CREATE INDEX "LevelUpReaction_memberId_idx" ON "LevelUpReaction"("memberId");

-- CreateIndex
CREATE INDEX "LevelUpComment_levelChangeId_createdAt_idx" ON "LevelUpComment"("levelChangeId", "createdAt");

-- CreateIndex
CREATE INDEX "Cheer_toMemberId_createdAt_idx" ON "Cheer"("toMemberId", "createdAt");

-- CreateIndex
CREATE INDEX "Cheer_mentorMemberId_idx" ON "Cheer"("mentorMemberId");

-- CreateIndex
CREATE INDEX "OneOnOneNote_managerMemberId_memberId_idx" ON "OneOnOneNote"("managerMemberId", "memberId");

-- CreateIndex
CREATE INDEX "Notification_skillLevelChangeId_idx" ON "Notification"("skillLevelChangeId");

-- CreateIndex
CREATE INDEX "Notification_cheerId_idx" ON "Notification"("cheerId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_targetRoleId_fkey" FOREIGN KEY ("targetRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillLevelChange" ADD CONSTRAINT "SkillLevelChange_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillLevelChange" ADD CONSTRAINT "SkillLevelChange_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillLevelChange" ADD CONSTRAINT "SkillLevelChange_skillSelfAssessmentId_fkey" FOREIGN KEY ("skillSelfAssessmentId") REFERENCES "SkillSelfAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillLevelChange" ADD CONSTRAINT "SkillLevelChange_changedByMemberId_fkey" FOREIGN KEY ("changedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelUpReaction" ADD CONSTRAINT "LevelUpReaction_levelChangeId_fkey" FOREIGN KEY ("levelChangeId") REFERENCES "SkillLevelChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelUpReaction" ADD CONSTRAINT "LevelUpReaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelUpComment" ADD CONSTRAINT "LevelUpComment_levelChangeId_fkey" FOREIGN KEY ("levelChangeId") REFERENCES "SkillLevelChange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelUpComment" ADD CONSTRAINT "LevelUpComment_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_targetSkillId_fkey" FOREIGN KEY ("targetSkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cheer" ADD CONSTRAINT "Cheer_mentorMemberId_fkey" FOREIGN KEY ("mentorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOneNote" ADD CONSTRAINT "OneOnOneNote_managerMemberId_fkey" FOREIGN KEY ("managerMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOneNote" ADD CONSTRAINT "OneOnOneNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_skillLevelChangeId_fkey" FOREIGN KEY ("skillLevelChangeId") REFERENCES "SkillLevelChange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_cheerId_fkey" FOREIGN KEY ("cheerId") REFERENCES "Cheer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
