import type { AuthRole } from "@prisma/client";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { fallbackMemberProfile, resolveMemberProfiles } from "@/modules/members/application/member-directory";
import { buildSkillMap } from "@/modules/skill-map/domain/skill-map-matrix";
import {
  getSkillHolders,
  getSkillMapData
} from "@/modules/skill-map/infrastructure/skill-map-repository";

export async function getSkillMapPageData(role: AuthRole, memberId: string, nodeId?: string) {
  const scope = await getMemberScope(role, memberId, nodeId);
  const now = new Date();
  const source = await getSkillMapData(
    scope.memberIds,
    new Date(now.getTime() - 90 * 86400000)
  );
  const profiles = await resolveMemberProfiles(source.flatMap((skill) => skill.holders.map((holder) => holder.id)));
  const skills = buildSkillMap({
    skills: source.map((skill) => ({
      ...skill,
      holders: skill.holders.map((holder) => ({
        ...holder,
        name: (profiles.get(holder.id) ?? fallbackMemberProfile(holder.id)).name,
        avatarUrl: (profiles.get(holder.id) ?? fallbackMemberProfile(holder.id)).avatarUrl,
        avatarColor: (profiles.get(holder.id) ?? fallbackMemberProfile(holder.id)).avatarColor,
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
  nodeId?: string
) {
  const scope = await getMemberScope(role, memberId, nodeId);
  const holders = await getSkillHolders(skillId, scope.memberIds);
  const profiles = await resolveMemberProfiles(holders.map((item) => item.member.id));
  return holders.map((item) => ({
    ...(profiles.get(item.member.id) ?? fallbackMemberProfile(item.member.id)),
    id: item.member.id,
    level: item.level,
  }));
}
