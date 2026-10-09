import { describe, expect, it } from "vitest";

import {
  demoMemberSkills,
  demoMembers,
  demoRoles,
  demoSkillAssessments,
  demoSkillCategories,
  demoSkills,
  existingDemoMemberEmployeeNos
} from "./seed-demo-data";

function expectUnique(values: readonly string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("demo seed data", () => {
  it("has unique business keys", () => {
    expectUnique(demoSkills.map((skill) => skill.code));
    expectUnique(demoSkillCategories.map((category) => category.name));
    expectUnique(demoRoles.map((role) => role.name));
    expectUnique([
      ...existingDemoMemberEmployeeNos,
      ...demoMembers.map((member) => member.employeeNo)
    ]);
    expectUnique(demoMembers.map((member) => member.email));
  });

  it("only references defined skills, categories, and members", () => {
    const skillCodes = new Set(demoSkills.map((skill) => skill.code));
    const categoryNames = new Set(
      demoSkillCategories.map((category) => category.name)
    );
    const employeeNos = new Set([
      ...existingDemoMemberEmployeeNos,
      ...demoMembers.map((member) => member.employeeNo)
    ]);

    for (const skill of demoSkills) {
      expect(categoryNames.has(skill.categoryName)).toBe(true);
    }
    for (const memberSkill of demoMemberSkills) {
      expect(skillCodes.has(memberSkill.skillCode)).toBe(true);
      expect(employeeNos.has(memberSkill.employeeNo)).toBe(true);
    }
    for (const role of demoRoles) {
      for (const requirement of role.requirements) {
        expect(skillCodes.has(requirement.skillCode)).toBe(true);
      }
    }
    for (const assessment of demoSkillAssessments) {
      expect(skillCodes.has(assessment.skillCode)).toBe(true);
      expect(employeeNos.has(assessment.employeeNo)).toBe(true);
    }
  });

  it("uses levels from 1 through 5", () => {
    const levels = [
      ...demoMemberSkills.map((memberSkill) => memberSkill.level),
      ...demoRoles.flatMap((role) =>
        role.requirements.map((requirement) => requirement.requiredLevel)
      ),
      ...demoSkillAssessments.map((assessment) => assessment.requestedLevel)
    ];

    expect(levels.every((level) => level >= 1 && level <= 5)).toBe(true);
  });

  it("leaves at least one additional member without skills", () => {
    const employeeNosWithSkills = new Set<string>(
      demoMemberSkills.map((memberSkill) => memberSkill.employeeNo)
    );

    expect(
      demoMembers.some(
        (member) => !employeeNosWithSkills.has(member.employeeNo)
      )
    ).toBe(true);
  });

  it("uses example.com for every additional member email", () => {
    expect(
      demoMembers.every((member) => member.email.endsWith("@example.com"))
    ).toBe(true);
  });
});
