CREATE TABLE "SkillSheetTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "fileName" VARCHAR(200) NOT NULL,
    "content" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillSheetTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillSheetTemplate_name_key" ON "SkillSheetTemplate"("name");
CREATE INDEX "SkillSheetTemplate_updatedById_idx" ON "SkillSheetTemplate"("updatedById");

ALTER TABLE "SkillSheetTemplate" ADD CONSTRAINT "SkillSheetTemplate_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
