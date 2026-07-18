import { buildSkillMapMatrix } from "@/modules/skill-map/domain/skill-map-matrix";
import { getSkillMapData } from "@/modules/skill-map/infrastructure/skill-map-repository";

export async function getSkillMapMatrix() {
  return buildSkillMapMatrix(await getSkillMapData());
}
