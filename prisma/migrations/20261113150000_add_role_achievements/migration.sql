-- CreateTable
CREATE TABLE "RoleAchievement" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "achievedAsTarget" BOOLEAN NOT NULL,
    "celebratedAt" TIMESTAMP(3),
    "requirements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleAchievement_memberId_roleId_key" ON "RoleAchievement"("memberId", "roleId");

-- CreateIndex
CREATE INDEX "RoleAchievement_roleId_idx" ON "RoleAchievement"("roleId");

-- AddForeignKey
ALTER TABLE "RoleAchievement" ADD CONSTRAINT "RoleAchievement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAchievement" ADD CONSTRAINT "RoleAchievement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill achievements that satisfy every required unit at migration time.
INSERT INTO "RoleAchievement" (
    "id",
    "memberId",
    "roleId",
    "achievedAt",
    "achievedAsTarget",
    "celebratedAt",
    "requirements"
)
SELECT
    gen_random_uuid()::text,
    member."id",
    role."id",
    achievement."achievedAt",
    COALESCE(member."targetRoleId" = role."id", false),
    achievement."achievedAt",
    requirements."snapshot"
FROM "Member" member
CROSS JOIN "Role" role
CROSS JOIN LATERAL (
    SELECT COALESCE(MAX(change."changedAt"), CURRENT_TIMESTAMP) AS "achievedAt"
    FROM "SkillLevelChange" change
    WHERE change."memberId" = member."id"
      AND change."skillId" IN (
          SELECT requirement."skillId"
          FROM "RoleRequirement" requirement
          WHERE requirement."roleId" = role."id"
      )
) achievement
CROSS JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'skillId', requirement."skillId",
            'skillName', skill."name",
            'requiredLevel', requirement."requiredLevel",
            'isRequired', requirement."isRequired",
            'anyOfGroup', requirement."anyOfGroup"
        )
        ORDER BY requirement."createdAt", requirement."id"
    ) AS "snapshot"
    FROM "RoleRequirement" requirement
    JOIN "Skill" skill ON skill."id" = requirement."skillId"
    WHERE requirement."roleId" = role."id"
) requirements
WHERE role."isActive" = true
  AND EXISTS (
      SELECT 1
      FROM "RoleRequirement" requirement
      WHERE requirement."roleId" = role."id"
        AND requirement."isRequired" = true
  )
  AND NOT EXISTS (
      SELECT 1
      FROM "RoleRequirement" requirement
      LEFT JOIN "MemberSkill" member_skill
        ON member_skill."memberId" = member."id"
       AND member_skill."skillId" = requirement."skillId"
      WHERE requirement."roleId" = role."id"
        AND requirement."isRequired" = true
        AND requirement."anyOfGroup" IS NULL
        AND COALESCE(member_skill."level", 0) < requirement."requiredLevel"
  )
  AND NOT EXISTS (
      SELECT 1
      FROM "RoleRequirement" grouped_requirement
      WHERE grouped_requirement."roleId" = role."id"
        AND grouped_requirement."isRequired" = true
        AND grouped_requirement."anyOfGroup" IS NOT NULL
      GROUP BY grouped_requirement."anyOfGroup"
      HAVING NOT bool_or(EXISTS (
          SELECT 1
          FROM "MemberSkill" member_skill
          WHERE member_skill."memberId" = member."id"
            AND member_skill."skillId" = grouped_requirement."skillId"
            AND member_skill."level" >= grouped_requirement."requiredLevel"
      ))
  );
