-- CreateTable
CREATE TABLE "SkillLevelGuide" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillLevelGuide_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SkillLevelGuide_level_check" CHECK ("level" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillLevelGuide_skillId_level_key" ON "SkillLevelGuide"("skillId", "level");

-- CreateIndex
CREATE INDEX "SkillLevelGuide_skillId_idx" ON "SkillLevelGuide"("skillId");

-- AddForeignKey
ALTER TABLE "SkillLevelGuide" ADD CONSTRAINT "SkillLevelGuide_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
