CREATE TYPE "TeamGoalKind" AS ENUM ('LEVEL_UP_COUNT', 'LEVEL_UP_MEMBERS', 'SKILL_REACH');

CREATE TABLE "TeamGoal" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "kind" "TeamGoalKind" NOT NULL,
    "skillId" TEXT,
    "targetLevel" INTEGER,
    "targetCount" INTEGER NOT NULL,
    "note" TEXT,
    "startMonth" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamGoal_managerId_createdAt_idx" ON "TeamGoal"("managerId", "createdAt");

ALTER TABLE "TeamGoal" ADD CONSTRAINT "TeamGoal_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamGoal" ADD CONSTRAINT "TeamGoal_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
