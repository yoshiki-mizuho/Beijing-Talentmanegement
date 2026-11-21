DROP TABLE "User";

ALTER TABLE "Member"
  ADD COLUMN "platformUserId" TEXT,
  ALTER COLUMN "employeeNo" DROP NOT NULL,
  ALTER COLUMN "name" DROP NOT NULL,
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "departmentId" DROP NOT NULL;

DROP INDEX "Member_tenant_id_employeeNo_key";
DROP INDEX "Member_tenant_id_email_key";

CREATE UNIQUE INDEX "Member_tenant_id_platformUserId_key"
  ON "Member"("tenant_id", "platformUserId");

ALTER TABLE "Member" DROP CONSTRAINT "Member_departmentId_fkey";
ALTER TABLE "Member" ADD CONSTRAINT "Member_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
