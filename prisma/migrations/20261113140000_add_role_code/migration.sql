ALTER TABLE "Role" ADD COLUMN "code" TEXT;

WITH numbered_roles AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS number
  FROM "Role"
)
UPDATE "Role"
SET "code" = 'ROLE-' || LPAD(numbered_roles.number::TEXT, 4, '0')
FROM numbered_roles
WHERE "Role"."id" = numbered_roles."id";

ALTER TABLE "Role" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
