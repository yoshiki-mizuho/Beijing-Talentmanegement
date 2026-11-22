import { describe, expect, it } from "vitest";

import {
  demoLevelUpComments,
  demoLevelUpReactions,
  demoMemberProfiles,
  demoMembers,
  demoMemberSkills,
  demoRoles,
  demoSkillAssessments,
  demoSkillCategoryGroups,
  demoSkillCategories,
  demoSkillLevelChanges,
  demoSkillPrerequisites,
  demoSkills,
  demoTargetRoleAssignments,
  seedMemberMapping
} from "./seed-demo-data";

function expectUnique(values: readonly string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("demo seed data", () => {
  it("uses the nine fixed devkit users without duplicates", () => {
    expect(demoMembers).toHaveLength(9);
    expectUnique(demoMembers.map((member) => member.platformUserId));
    expect(demoMembers.filter((member) => member.status === "INACTIVE"))
      .toEqual([
        {
          platformUserId: "22222222-2222-4222-8222-000000000009",
          status: "INACTIVE"
        }
      ]);
  });

  it("keeps the original master data and unique business keys", () => {
    expect(demoSkills.length).toBe(18);
    expect(demoRoles.length).toBeGreaterThan(2);
    expect(demoSkillCategoryGroups.length).toBeGreaterThan(0);
    expect(demoSkillPrerequisites.length).toBeGreaterThan(0);
    expectUnique(demoSkills.map((skill) => skill.code));
    expectUnique(demoSkillCategories.map((category) => category.name));
    expectUnique(demoSkillCategoryGroups.map((group) => group.name));
    expectUnique(demoRoles.map((role) => role.name));
  });

  it("only references defined skills, categories, roles, and devkit users", () => {
    const userIds = new Set(
      demoMembers.map((member) => member.platformUserId)
    );
    const skillCodes = new Set(demoSkills.map((skill) => skill.code));
    const skillNames = new Set(demoSkills.map((skill) => skill.name));
    const categoryNames = new Set(
      demoSkillCategories.map((category) => category.name)
    );
    const roleNames = new Set(demoRoles.map((role) => role.name));

    for (const skill of demoSkills) {
      expect(categoryNames.has(skill.categoryName)).toBe(true);
    }
    for (const prerequisite of demoSkillPrerequisites) {
      expect(skillNames.has(prerequisite.skillName)).toBe(true);
      expect(skillNames.has(prerequisite.prerequisiteSkillName)).toBe(true);
      expect(prerequisite.skillName).not.toBe(
        prerequisite.prerequisiteSkillName
      );
    }
    for (const role of demoRoles) {
      for (const requirement of role.requirements) {
        expect(skillCodes.has(requirement.skillCode)).toBe(true);
      }
    }
    for (const item of [
      ...demoMemberSkills,
      ...demoSkillAssessments,
      ...demoSkillLevelChanges
    ]) {
      expect(userIds.has(item.platformUserId)).toBe(true);
      expect(skillCodes.has(item.skillCode)).toBe(true);
    }
    for (const profile of demoMemberProfiles) {
      expect(userIds.has(profile.platformUserId)).toBe(true);
    }
    for (const assignment of demoTargetRoleAssignments) {
      expect(userIds.has(assignment.platformUserId)).toBe(true);
      expect(roleNames.has(assignment.roleName)).toBe(true);
    }
  });

  it("deduplicates merged member skills and keeps valid levels", () => {
    expectUnique(
      demoMemberSkills.map(
        (item) => `${item.platformUserId}:${item.skillCode}`
      )
    );
    expect(
      demoMemberSkills.every(
        (item) => item.level >= 1 && item.level <= 5
      )
    ).toBe(true);
  });

  it("keeps level-up reactions and comments internally consistent", () => {
    const userIds = new Set(
      demoMembers.map((member) => member.platformUserId)
    );
    const skillCodes = new Set(demoSkills.map((skill) => skill.code));

    for (const reaction of demoLevelUpReactions) {
      expect(userIds.has(reaction.levelChangePlatformUserId)).toBe(true);
      expect(userIds.has(reaction.memberPlatformUserId)).toBe(true);
      expect(skillCodes.has(reaction.skillCode)).toBe(true);
    }
    for (const comment of demoLevelUpComments) {
      expect(userIds.has(comment.levelChangePlatformUserId)).toBe(true);
      expect(userIds.has(comment.authorPlatformUserId)).toBe(true);
      expect(skillCodes.has(comment.skillCode)).toBe(true);
    }
  });

  it("documents every legacy-to-devkit reassignment", () => {
    expect(seedMemberMapping).toHaveLength(14);
    expectUnique(seedMemberMapping.map((item) => item.legacyMemberKey));

    const userIds = new Set(
      demoMembers.map((member) => member.platformUserId)
    );
    expect(
      seedMemberMapping.every((item) => userIds.has(item.platformUserId))
    ).toBe(true);
  });

  it("uses actual devkit leader-member pairs for directional sample data", () => {
    const leaderMemberPairs = new Set([
      "22222222-2222-4222-8222-000000000004:22222222-2222-4222-8222-000000000005",
      "22222222-2222-4222-8222-000000000006:22222222-2222-4222-8222-000000000007",
      "22222222-2222-4222-8222-000000000008:22222222-2222-4222-8222-000000000009"
    ]);

    for (const reaction of demoLevelUpReactions) {
      expect(leaderMemberPairs.has(
        `${reaction.memberPlatformUserId}:${reaction.levelChangePlatformUserId}`
      )).toBe(true);
    }
    for (const comment of demoLevelUpComments) {
      expect(leaderMemberPairs.has(
        `${comment.authorPlatformUserId}:${comment.levelChangePlatformUserId}`
      )).toBe(true);
    }
  });
});
