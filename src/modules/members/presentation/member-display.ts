type DisplayMemberSkill = {
  level: number;
  skill: {
    name: string;
  };
};

export function sortMemberSkillsByLevel<T extends DisplayMemberSkill>(
  memberSkills: readonly T[]
) {
  return [...memberSkills].sort(
    (left, right) =>
      right.level - left.level ||
      left.skill.name.localeCompare(right.skill.name, "ja")
  );
}

export function summarizeMemberSkills<T extends DisplayMemberSkill>(
  memberSkills: readonly T[],
  visibleCount = 3
) {
  const sortedSkills = sortMemberSkillsByLevel(memberSkills);

  return {
    visibleSkills: sortedSkills.slice(0, visibleCount),
    hiddenSkills: sortedSkills.slice(visibleCount)
  };
}

export function getMemberStatusLabel(status: string) {
  if (status === "ACTIVE") return "在籍中";
  if (status === "LEAVE") return "休職中";
  if (status === "INACTIVE") return "退職・無効";
  return "不明";
}
