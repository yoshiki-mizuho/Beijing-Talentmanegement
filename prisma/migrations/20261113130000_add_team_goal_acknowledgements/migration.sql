CREATE TABLE "TeamGoalAcknowledgement" (
    "id" TEXT NOT NULL,
    "teamGoalId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamGoalAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamGoalAcknowledgement_teamGoalId_memberId_key" ON "TeamGoalAcknowledgement"("teamGoalId", "memberId");

ALTER TABLE "TeamGoalAcknowledgement" ADD CONSTRAINT "TeamGoalAcknowledgement_teamGoalId_fkey" FOREIGN KEY ("teamGoalId") REFERENCES "TeamGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamGoalAcknowledgement" ADD CONSTRAINT "TeamGoalAcknowledgement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
