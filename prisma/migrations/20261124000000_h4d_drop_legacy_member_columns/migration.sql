DELETE FROM "CsvImportJob"
WHERE "targetType" IN ('DEPARTMENTS', 'MEMBERS');

ALTER TYPE "CsvImportTargetType" RENAME TO "CsvImportTargetType_old";
CREATE TYPE "CsvImportTargetType" AS ENUM ('SKILLS', 'MEMBER_SKILLS', 'ROLES');
ALTER TABLE "CsvImportJob"
  ALTER COLUMN "targetType" TYPE "CsvImportTargetType"
  USING ("targetType"::text::"CsvImportTargetType");
DROP TYPE "CsvImportTargetType_old";

UPDATE "Member" SET "status" = 'INACTIVE' WHERE "status" = 'LEAVE';
ALTER TYPE "MemberStatus" RENAME TO "MemberStatus_old";
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "Member"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MemberStatus"
  USING ("status"::text::"MemberStatus"),
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "MemberStatus_old";

ALTER TABLE "Member" ALTER COLUMN "platformUserId" SET NOT NULL;

ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_departmentId_fkey";
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_managerId_fkey";
DROP INDEX IF EXISTS "Member_departmentId_idx";
DROP INDEX IF EXISTS "Member_managerId_idx";
ALTER TABLE "Member"
  DROP COLUMN "employeeNo",
  DROP COLUMN "name",
  DROP COLUMN "email",
  DROP COLUMN "departmentId",
  DROP COLUMN "jobTitle",
  DROP COLUMN "avatarImage",
  DROP COLUMN "avatarMimeType",
  DROP COLUMN "avatarUpdatedAt",
  DROP COLUMN "managerId";

DROP TABLE "Department";
