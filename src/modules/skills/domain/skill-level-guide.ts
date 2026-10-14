export type SkillLevelDescription = {
  level: number;
  description: string;
};

export function resolveSkillLevelDescription(
  level: number,
  commonGuides: ReadonlyArray<SkillLevelDescription>,
  skillGuides: ReadonlyArray<SkillLevelDescription>
) {
  return (
    skillGuides.find((guide) => guide.level === level)?.description ??
    commonGuides.find((guide) => guide.level === level)?.description
  );
}
