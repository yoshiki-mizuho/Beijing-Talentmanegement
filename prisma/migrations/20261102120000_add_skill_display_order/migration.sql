ALTER TABLE "Skill" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_categories AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "displayOrder", name) - 1 AS position
  FROM "SkillCategory"
)
UPDATE "SkillCategory" AS category
SET "displayOrder" = ordered_categories.position
FROM ordered_categories
WHERE category.id = ordered_categories.id;

WITH ordered_skills AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY name) - 1 AS position
  FROM "Skill"
)
UPDATE "Skill" AS skill
SET "displayOrder" = ordered_skills.position
FROM ordered_skills
WHERE skill.id = ordered_skills.id;
