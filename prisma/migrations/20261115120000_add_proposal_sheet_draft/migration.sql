CREATE TYPE "ProposalSheetDraftSource" AS ENUM ('AI', 'FALLBACK', 'MANUAL');

CREATE TABLE "ProposalSheetDraft" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "customerRequest" TEXT NOT NULL,
    "projectHistoryIds" TEXT[],
    "excludedSkillIds" TEXT[],
    "selfPr" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "projectDescriptions" JSONB NOT NULL,
    "source" "ProposalSheetDraftSource" NOT NULL,
    "inputHash" TEXT,
    "model" TEXT,
    "generatedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalSheetDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProposalSheetDraft_memberId_key" ON "ProposalSheetDraft"("memberId");
CREATE INDEX "ProposalSheetDraft_updatedById_idx" ON "ProposalSheetDraft"("updatedById");

ALTER TABLE "ProposalSheetDraft" ADD CONSTRAINT "ProposalSheetDraft_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalSheetDraft" ADD CONSTRAINT "ProposalSheetDraft_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
