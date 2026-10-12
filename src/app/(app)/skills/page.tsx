import { listSkillCategories, listSkills } from "@/modules/skills/application/skill-service";
import { SkillPageHeader } from "@/modules/skills/presentation/skill-page-header";
import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";
import { SkillSearchTable } from "@/modules/skills/presentation/skill-search-table";
import { Card, CardContent } from "@/shared/ui/card";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await requirePageRoles(managerOrAdmin);
  const canManageSkills = canManageSkillMaster(session.user.role);
  const [categories, skills] = await Promise.all([
    listSkillCategories(),
    listSkills()
  ]);
  return (
    <div className="space-y-6">
      <SkillPageHeader
        categories={categories}
        canManage={canManageSkills}
        skillCount={skills.length}
      />

      <Card>
        <CardContent>
          <SkillSearchTable
            initialSkills={skills}
            categories={categories}
            canManage={canManageSkills}
          />
        </CardContent>
      </Card>
    </div>
  );
}
