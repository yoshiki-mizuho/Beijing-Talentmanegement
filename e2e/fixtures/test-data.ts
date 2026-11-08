import { randomBytes } from "node:crypto";

import type {
  AuthRole,
  Department,
  LevelUpReactionType,
  Member,
  NotificationStatus,
  NotificationType,
  Role,
  Skill,
  SkillCategory,
  SkillLevelChangeSource,
  SkillSelfAssessmentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { deleteE2eData, type E2eDataIds } from "../../prisma/delete-e2e-data";
import { prisma } from "../../src/server/db/prisma";
import type { DemoCredential } from "../helpers/credentials";

export function createE2ePrefix() {
  return `E2E-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

export function createE2eTestData() {
  const prefix = createE2ePrefix();
  const ids: E2eDataIds = {
    memberIds: [], skillIds: [], categoryIds: [], roleIds: [], departmentIds: [],
  };
  let sequence = 0;
  const unique = (label: string) => `${prefix}-${label}-${++sequence}`;
  const appendUnique = (target: string[], values: string[]) => {
    for (const value of values) {
      if (!target.includes(value)) target.push(value);
    }
  };

  return {
    prefix,
    track(input: Partial<E2eDataIds>) {
      appendUnique(ids.memberIds, input.memberIds ?? []);
      appendUnique(ids.skillIds, input.skillIds ?? []);
      appendUnique(ids.categoryIds, input.categoryIds ?? []);
      appendUnique(ids.roleIds, input.roleIds ?? []);
      appendUnique(ids.departmentIds, input.departmentIds ?? []);
    },
    async trackCreated(input: {
      memberEmails?: string[];
      skillNames?: string[];
      categoryNames?: string[];
      roleNames?: string[];
      departmentCodes?: string[];
    }) {
      const [members, skills, categories, roles, departments] = await Promise.all([
        prisma.member.findMany({ where: { email: { in: input.memberEmails ?? [] } }, select: { id: true } }),
        prisma.skill.findMany({ where: { name: { in: input.skillNames ?? [] } }, select: { id: true } }),
        prisma.skillCategory.findMany({ where: { name: { in: input.categoryNames ?? [] } }, select: { id: true } }),
        prisma.role.findMany({ where: { name: { in: input.roleNames ?? [] } }, select: { id: true } }),
        prisma.department.findMany({ where: { code: { in: input.departmentCodes ?? [] } }, select: { id: true } }),
      ]);
      appendUnique(ids.memberIds, members.map((item) => item.id));
      appendUnique(ids.skillIds, skills.map((item) => item.id));
      appendUnique(ids.categoryIds, categories.map((item) => item.id));
      appendUnique(ids.roleIds, roles.map((item) => item.id));
      appendUnique(ids.departmentIds, departments.map((item) => item.id));
    },
    async createDepartment(label: string, parentDepartmentId?: string): Promise<Department> {
      const value = unique(label);
      const department = await prisma.department.create({
        data: { code: value, name: value, parentDepartmentId },
      });
      ids.departmentIds.push(department.id);
      return department;
    },
    async createMember(input: {
      label: string;
      departmentId: string;
      role?: AuthRole;
      managerId?: string;
      targetRoleId?: string;
      createdAt?: Date;
      lastRecapSeenMonth?: string | null;
    }): Promise<{ member: Member; credential: DemoCredential }> {
      const value = unique(input.label);
      // ラベルは日本語のことがあるので、メールアドレスは接頭辞と連番だけで作る（形式チェックを通すため）
      const email = `e2e-${prefix.toLowerCase()}-${sequence}@example.com`;
      const password = randomBytes(24).toString("base64url");
      const passwordHash = await bcrypt.hash(password, 12);
      const member = await prisma.member.create({
        data: {
          employeeNo: value,
          name: value,
          email,
          departmentId: input.departmentId,
          managerId: input.managerId,
          targetRoleId: input.targetRoleId,
          createdAt: input.createdAt,
          lastRecapSeenMonth: input.lastRecapSeenMonth === undefined
            ? "2000-01"
            : input.lastRecapSeenMonth,
          users: { create: {
            name: value,
            email,
            role: input.role ?? "MEMBER",
            passwordHash,
            passwordChangeRequired: false,
          } },
        },
      });
      ids.memberIds.push(member.id);
      return { member, credential: { email, password } };
    },
    async createSkill(label: string): Promise<{ category: SkillCategory; skill: Skill }> {
      const categoryValue = unique(`${label}-category`);
      const category = await prisma.skillCategory.create({ data: { name: categoryValue } });
      ids.categoryIds.push(category.id);
      const skillValue = unique(label);
      const skill = await prisma.skill.create({
        data: { code: skillValue, name: skillValue, categoryId: category.id },
      });
      ids.skillIds.push(skill.id);
      return { category, skill };
    },
    async createRole(label: string, requirements: Array<{ skillId: string; requiredLevel: number }>): Promise<Role> {
      const value = unique(label);
      const role = await prisma.role.create({
        data: {
          name: value,
          roleRequirements: { create: requirements.map((item) => ({ ...item, isRequired: true })) },
        },
      });
      ids.roleIds.push(role.id);
      return role;
    },
    async createMemberSkill(input: { memberId: string; skillId: string; level: number; approvedByMemberId?: string }) {
      return prisma.memberSkill.create({ data: input });
    },
    async createSelfAssessment(input: {
      memberId: string;
      skillId: string;
      requestedLevel: number;
      status?: SkillSelfAssessmentStatus;
      applicantComment?: string;
      managerComment?: string;
      reviewedByMemberId?: string;
      reviewedAt?: Date;
      createdAt?: Date;
    }) {
      return prisma.skillSelfAssessment.create({ data: input });
    },
    async createNotification(input: {
      recipientMemberId: string;
      type: NotificationType;
      status?: NotificationStatus;
      skillSelfAssessmentId?: string;
      skillLevelChangeId?: string;
      title: string;
      body?: string;
      createdAt?: Date;
    }) {
      return prisma.notification.create({ data: input });
    },
    async createLevelChange(input: {
      memberId: string;
      skillId: string;
      fromLevel: number | null;
      toLevel: number;
      changedByMemberId?: string;
      source?: SkillLevelChangeSource;
      skillSelfAssessmentId?: string;
      changedAt?: Date;
      createdAt?: Date;
    }) {
      return prisma.skillLevelChange.create({
        data: { ...input, source: input.source ?? "DIRECT_EDIT" },
      });
    },
    async createLevelUpReaction(input: {
      levelChangeId: string;
      memberId: string;
      type: LevelUpReactionType;
      createdAt?: Date;
    }) {
      return prisma.levelUpReaction.create({ data: input });
    },
    cleanup() {
      return deleteE2eData(prisma, ids);
    },
  };
}
