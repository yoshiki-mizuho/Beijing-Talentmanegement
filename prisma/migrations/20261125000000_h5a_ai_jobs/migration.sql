CREATE TYPE "AiJobKind" AS ENUM ('GROWTH_HINT', 'PROPOSAL_SHEET', 'SKILL_PREREQUISITE');

CREATE TYPE "AiJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL DEFAULT current_setting('app.tenant_id', true)::uuid,
    "kind" "AiJobKind" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
    "targetMemberId" TEXT,
    "requestedByMemberId" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "model" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubTenant" (
    "id" UUID NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HubTenant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiJob_tenant_id_idx" ON "AiJob"("tenant_id");
CREATE INDEX "AiJob_status_nextRunAt_idx" ON "AiJob"("status", "nextRunAt");
CREATE INDEX "AiJob_kind_targetMemberId_status_idx" ON "AiJob"("kind", "targetMemberId", "status");

ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_targetMemberId_fkey"
  FOREIGN KEY ("targetMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_requestedByMemberId_fkey"
  FOREIGN KEY ("requestedByMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiJob" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AiJob"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
