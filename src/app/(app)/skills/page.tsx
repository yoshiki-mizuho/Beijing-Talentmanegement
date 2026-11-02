import {
  listSkillCategories,
  listSkillLevels,
  listSkills
} from "@/modules/skills/application/skill-service";
import { SkillManagement } from "@/modules/skills/presentation/skill-management";
import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await requirePageRoles(adminOnly);
  const canManageSkills = canManageSkillMaster(session.user.role);
  const [categories, skills, levels] = await Promise.all([
    listSkillCategories(),
    listSkills(),
    listSkillLevels()
  ]);
  return <SkillManagement categories={categories} skills={skills} levels={levels} canManage={canManageSkills} />;
}
