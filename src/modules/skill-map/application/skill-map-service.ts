import type { AuthRole } from "@prisma/client";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { buildSkillMap } from "@/modules/skill-map/domain/skill-map-matrix";
import { getSkillMapData } from "@/modules/skill-map/infrastructure/skill-map-repository";

export async function getSkillMapPageData(role: AuthRole, memberId: string, departmentId?: string) {
  const scope = await getMemberScope(role, memberId, departmentId);
  const now = new Date();
  const skills = buildSkillMap({ skills: await getSkillMapData(scope.memberIds, new Date(now.getTime() - 90 * 86400000)), now });
  const categories = [...new Map(skills.map((skill) => [skill.category.id, { id: skill.category.id, name: skill.category.name }])).values()];
  return { scope, skills, categories };
}
