import type { AuthRole } from "@prisma/client";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { displayMemberName } from "@/modules/members/domain/member-display";
import { buildSkillMap } from "@/modules/skill-map/domain/skill-map-matrix";
import {
  getSkillHolders,
  getSkillMapData
} from "@/modules/skill-map/infrastructure/skill-map-repository";

export async function getSkillMapPageData(role: AuthRole, memberId: string, departmentId?: string) {
  const scope = await getMemberScope(role, memberId, departmentId);
  const now = new Date();
  const source = await getSkillMapData(
    scope.memberIds,
    new Date(now.getTime() - 90 * 86400000)
  );
  const skills = buildSkillMap({
    skills: source.map((skill) => ({
      ...skill,
      holders: skill.holders.map((holder) => ({
        ...holder,
        name: displayMemberName(holder.name)
      }))
    })),
    now
  });
  const categories = [...new Map(skills.map((skill) => [skill.category.id, { id: skill.category.id, name: skill.category.name }])).values()];
  return {
    scope,
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      holderCount: skill.holderCount,
      averageLevel: skill.averageLevel,
      rank: skill.rank,
      totalRanked: skill.totalRanked,
      strength: skill.strength,
      growthCount: skill.growthCount,
      levelCounts: skill.levelCounts
    })),
    categories
  };
}

export async function listSkillHolders(
  role: AuthRole,
  memberId: string,
  skillId: string,
  departmentId?: string
) {
  const scope = await getMemberScope(role, memberId, departmentId);
  return (await getSkillHolders(skillId, scope.memberIds)).map((item) => ({
    ...item.member,
    level: item.level,
    avatarUpdatedAt: item.member.avatarUpdatedAt?.toISOString() ?? null
  }));
}
