import {
  listSkillCategories,
  listSkillLevels,
  listSkills
} from "@/modules/skills/application/skill-service";
import { SkillPageHeader } from "@/modules/skills/presentation/skill-page-header";
import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";
import { SkillSearchTable } from "@/modules/skills/presentation/skill-search-table";
import { Card, CardContent } from "@/shared/ui/card";
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
  return (
    <div className="space-y-6">
      <SkillPageHeader
        categories={categories}
        canManage={canManageSkills}
        skillCount={skills.length}
      />

      <Card>
        <CardContent className="pt-5">
          <SkillSearchTable
            initialSkills={skills}
            categories={categories}
            levels={levels}
            canManage={canManageSkills}
          />
        </CardContent>
      </Card>
    </div>
  );
}
