CREATE TYPE "GrowthHintSource" AS ENUM ('AI', 'FALLBACK');

CREATE TYPE "AiUsageStatus" AS ENUM ('SUCCESS', 'FAILED', 'FALLBACK');

CREATE TABLE "GrowthHint" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "source" "GrowthHintSource" NOT NULL,
    "inputHash" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthHint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "actorMemberId" TEXT,
    "targetMemberId" TEXT,
    "model" TEXT,
    "status" "AiUsageStatus" NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthHint_memberId_key" ON "GrowthHint"("memberId");

CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

CREATE INDEX "AiUsageLog_feature_createdAt_idx" ON "AiUsageLog"("feature", "createdAt");

ALTER TABLE "GrowthHint" ADD CONSTRAINT "GrowthHint_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GrowthHint" ADD CONSTRAINT "GrowthHint_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
