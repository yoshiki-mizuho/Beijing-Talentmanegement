ALTER TABLE "Member"
ADD COLUMN "itCareerStartMonth" TEXT,
ADD COLUMN "skillSheetNote" TEXT;

CREATE TABLE "MemberProjectHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    "industry" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "businessArea" TEXT,
    "phases" TEXT[] NOT NULL,
    "technologies" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemberProjectHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberCertification" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acquiredMonth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemberCertification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberProjectHistory_memberId_startMonth_idx"
ON "MemberProjectHistory"("memberId", "startMonth");

CREATE INDEX "MemberCertification_memberId_idx"
ON "MemberCertification"("memberId");

ALTER TABLE "MemberProjectHistory"
ADD CONSTRAINT "MemberProjectHistory_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberCertification"
ADD CONSTRAINT "MemberCertification_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
