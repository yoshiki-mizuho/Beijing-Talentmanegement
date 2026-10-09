import { describe, expect, it } from "vitest";

import {
  demoMemberSkills,
  demoManagerAssignments,
  demoMembers,
  demoRoles,
  demoSkillAssessments,
  demoSkillLevelChanges,
  demoSkillCategories,
  demoSkills,
  demoTargetRoleAssignments,
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

  it("assigns valid managers without self-reference or cycles", () => {
    const employeeNos = new Set([
      ...existingDemoMemberEmployeeNos,
      ...demoMembers.map((member) => member.employeeNo)
    ]);
    const managerByEmployeeNo = new Map<string, string>(
      demoManagerAssignments.map((assignment) => [
        assignment.employeeNo,
        assignment.managerEmployeeNo
      ])
    );

    for (const assignment of demoManagerAssignments) {
      expect(employeeNos.has(assignment.employeeNo)).toBe(true);
      expect(employeeNos.has(assignment.managerEmployeeNo)).toBe(true);
      expect(assignment.employeeNo).not.toBe(assignment.managerEmployeeNo);

      const visited = new Set<string>();
      let managerEmployeeNo: string | undefined = assignment.managerEmployeeNo;
      while (managerEmployeeNo) {
        expect(managerEmployeeNo).not.toBe(assignment.employeeNo);
        if (visited.has(managerEmployeeNo)) break;
        visited.add(managerEmployeeNo);
        managerEmployeeNo = managerByEmployeeNo.get(managerEmployeeNo);
      }
    }
  });

  it("keeps some target roles unset and only references defined roles", () => {
    const roleNames = new Set(demoRoles.map((role) => role.name));
    const assignedEmployeeNos = new Set<string>(
      demoTargetRoleAssignments.map((assignment) => assignment.employeeNo)
    );

    expect(demoTargetRoleAssignments.every((assignment) =>
      roleNames.has(assignment.roleName)
    )).toBe(true);
    expect(demoMembers.some((member) =>
      !assignedEmployeeNos.has(member.employeeNo)
    )).toBe(true);
  });

  it("matches every skill history's latest level to MemberSkill", () => {
    const memberSkillLevelByKey = new Map(
      demoMemberSkills.map((memberSkill) => [
        `${memberSkill.employeeNo}:${memberSkill.skillCode}`,
        memberSkill.level
      ])
    );
    const latestByKey = new Map<string, (typeof demoSkillLevelChanges)[number]>();

    for (const change of demoSkillLevelChanges) {
      const key = `${change.employeeNo}:${change.skillCode}`;
      const current = latestByKey.get(key);
      if (!current || current.changedAt < change.changedAt) {
        latestByKey.set(key, change);
      }
    }

    for (const [key, change] of latestByKey) {
      expect(memberSkillLevelByKey.get(key)).toBe(change.toLevel);
      expect(change.fromLevel).not.toBe(change.toLevel);
    }
  });

  it("assigns a manager to every member with demo skill history", () => {
    const managerEmployeeNoByMember = new Map(
      demoManagerAssignments.map((assignment) => [
        assignment.employeeNo,
        assignment.managerEmployeeNo
      ])
    );

    for (const change of demoSkillLevelChanges) {
      expect(managerEmployeeNoByMember.get(change.employeeNo)).toBeTruthy();
    }
  });

  it("gives Member User a level-up in three consecutive months", () => {
    const months = demoSkillLevelChanges
      .filter((change) => change.employeeNo === "TM0003")
      .map((change) => change.changedAt.slice(0, 7));

    expect(months).toEqual(["2026-08", "2026-09", "2026-10"]);
  });
});
