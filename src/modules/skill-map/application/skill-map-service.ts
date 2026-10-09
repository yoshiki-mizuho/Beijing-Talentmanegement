import {
  buildSkillMapMatrix,
  filterSkillMapData,
  type SkillMapFilters
} from "@/modules/skill-map/domain/skill-map-matrix";
import { getSkillMapData } from "@/modules/skill-map/infrastructure/skill-map-repository";

export async function getSkillMapPageData(filters: SkillMapFilters = {}) {
  const data = await getSkillMapData();
  const departments = Array.from(
    new Map(
      data.members.map((member) => [
        member.department.id,
        { id: member.department.id, name: member.department.name }
      ])
    ).values()
  ).sort((left, right) => left.name.localeCompare(right.name, "ja"));
  const categories = Array.from(
    new Map(
      data.skills.map((skill) => [
        skill.category.id,
        { id: skill.category.id, name: skill.category.name }
      ])
    ).values()
  );

  return {
    matrix: buildSkillMapMatrix(filterSkillMapData(data, filters)),
    departments,
    categories
  };
}

export async function getSkillMapMatrix() {
  return (await getSkillMapPageData()).matrix;
}
