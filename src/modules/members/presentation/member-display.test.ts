import { describe, expect, it } from "vitest";

import {
  getTargetRoleProgressLabel,
  sortMemberSkillsByLevel,
  summarizeMemberSkills
} from "@/modules/members/presentation/member-display";

const memberSkills = [
  { id: "skill-1", level: 2, skill: { name: "TypeScript" } },
  { id: "skill-2", level: 5, skill: { name: "React" } },
  { id: "skill-3", level: 3, skill: { name: "AWS" } },
  { id: "skill-4", level: 4, skill: { name: "PostgreSQL" } },
  { id: "skill-5", level: 1, skill: { name: "Docker" } }
];

describe("member display", () => {
  it("sorts skills by level without mutating the source", () => {
    const source = [...memberSkills];

    expect(
      sortMemberSkillsByLevel(source).map((memberSkill) => memberSkill.level)
    ).toEqual([5, 4, 3, 2, 1]);
    expect(source).toEqual(memberSkills);
  });

  it("shows the top three skills and separates the omitted skills", () => {
    const summary = summarizeMemberSkills(memberSkills);

    expect(summary.visibleSkills.map((memberSkill) => memberSkill.skill.name)).toEqual([
      "React",
      "PostgreSQL",
      "AWS"
    ]);
    expect(summary.hiddenSkills.map((memberSkill) => memberSkill.skill.name)).toEqual([
      "TypeScript",
      "Docker"
    ]);
  });
});

describe("getTargetRoleProgressLabel", () => {
  it("returns short progress labels", () => {
    expect(getTargetRoleProgressLabel(3, 3)).toBe("達成");
    expect(getTargetRoleProgressLabel(2, 3)).toBe("あと1");
    expect(getTargetRoleProgressLabel(1, 3)).toBe("1/3");
  });
});
