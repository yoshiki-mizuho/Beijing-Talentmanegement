-- SkillLevel は全テナント共通の表（RLS なし）。クラスタの migrate のジョブは seed を流さないため、
-- 5 段のレベルをここで入れる。値は prisma/seed.ts の skillLevels と同じ。既にある行は変えない。
INSERT INTO "SkillLevel" ("level", "label", "description") VALUES
  (1, 'Beginner', '基本概念を理解し、支援を受けて作業できる'),
  (2, 'Basic', '定型作業を自力で進められる'),
  (3, 'Intermediate', '通常業務で実用でき、周囲へ説明できる'),
  (4, 'Advanced', '複雑な課題を解決し、設計や改善を主導できる'),
  (5, 'Expert', '組織横断で標準化、育成、技術判断をリードできる')
ON CONFLICT ("level") DO NOTHING;
