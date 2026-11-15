import type { AuthRole } from "@prisma/client";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { buildSkillMap } from "@/modules/skill-map/domain/skill-map-matrix";
import {
  getSkillHolders,
  getSkillMapData
} from "@/modules/skill-map/infrastructure/skill-map-repository";

export async function getSkillMapPageData(role: AuthRole, memberId: string, departmentId?: string) {
  const scope = await getMemberScope(role, memberId, departmentId);
  const now = new Date();
  const skills = buildSkillMap({ skills: await getSkillMapData(scope.memberIds, new Date(now.getTime() - 90 * 86400000)), now });
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
