export type SkillMapMember = {
  id: string;
  employeeNo: string;
  name: string;
  department: {
    id: string;
    name: string;
  };
  memberSkills: {
    skillId: string;
    level: number;
  }[];
};

export type SkillMapSkill = {
  id: string;
  code: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
};

export type SkillMapFilters = {
  q?: string;
  departmentId?: string;
  categoryId?: string;
};

export function filterSkillMapData(
  input: {
    members: SkillMapMember[];
    skills: SkillMapSkill[];
  },
  filters: SkillMapFilters
) {
  const keyword = filters.q?.trim().toLocaleLowerCase("ja") ?? "";

  return {
    members: input.members.filter((member) =>
      (!filters.departmentId || member.department.id === filters.departmentId) &&
      (!keyword ||
        member.name.toLocaleLowerCase("ja").includes(keyword) ||
        member.employeeNo.toLocaleLowerCase("ja").includes(keyword))
    ),
    skills: input.skills.filter(
      (skill) => !filters.categoryId || skill.category.id === filters.categoryId
    )
  };
}

export function buildSkillMapMatrix(input: {
  members: SkillMapMember[];
  skills: SkillMapSkill[];
}) {
  const rows = input.members.map((member) => {
    const levelBySkillId = new Map(
      member.memberSkills.map((memberSkill) => [
        memberSkill.skillId,
        memberSkill.level
      ])
    );

    return {
      memberId: member.id,
      employeeNo: member.employeeNo,
      memberName: member.name,
      departmentName: member.department.name,
      levels: input.skills.map((skill) => ({
        skillId: skill.id,
        level: levelBySkillId.get(skill.id) ?? null
      }))
    };
  });
  const skillSummaries = input.skills.map((skill) => {
    const levels = rows
      .map((row) => row.levels.find((level) => level.skillId === skill.id)?.level)
      .filter((level): level is number => typeof level === "number");

    return {
      skillId: skill.id,
      holderCount: levels.length,
      averageLevel:
        levels.length === 0
          ? null
          : levels.reduce((sum, level) => sum + level, 0) / levels.length
    };
  });

  return {
    skills: input.skills,
    rows,
    skillSummaries
  };
}
