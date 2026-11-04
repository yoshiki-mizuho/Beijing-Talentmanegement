-- CreateEnum
CREATE TYPE "SkillPrerequisiteSource" AS ENUM ('AI_SUGGESTION', 'MANUAL');

-- AlterTable
ALTER TABLE "SkillCategory" ADD COLUMN "groupId" TEXT;

-- AlterTable
ALTER TABLE "SkillSelfAssessment" ADD COLUMN "applicantComment" TEXT;

-- CreateTable
CREATE TABLE "SkillCategoryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPrerequisite" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "prerequisiteSkillId" TEXT NOT NULL,
    "source" "SkillPrerequisiteSource" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategoryGroup_name_key" ON "SkillCategoryGroup"("name");

-- CreateIndex
CREATE INDEX "SkillCategory_groupId_idx" ON "SkillCategory"("groupId");

-- CreateIndex
CREATE INDEX "SkillPrerequisite_prerequisiteSkillId_idx" ON "SkillPrerequisite"("prerequisiteSkillId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillPrerequisite_skillId_prerequisiteSkillId_key" ON "SkillPrerequisite"("skillId", "prerequisiteSkillId");

-- AddForeignKey
ALTER TABLE "SkillCategory" ADD CONSTRAINT "SkillCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SkillCategoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_prerequisiteSkillId_fkey" FOREIGN KEY ("prerequisiteSkillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
