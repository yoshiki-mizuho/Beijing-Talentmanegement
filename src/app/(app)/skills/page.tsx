import {
  Activity,
  BookOpenCheck,
  FolderTree,
  UsersRound
} from "lucide-react";

import { listSkillCategories, listSkills } from "@/modules/skills/application/skill-service";
import { SkillPageHeader } from "@/modules/skills/presentation/skill-page-header";
import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";
import { SkillSearchTable } from "@/modules/skills/presentation/skill-search-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { Metric } from "@/shared/ui/metric";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await requirePageRoles(managerOrAdmin);
  const canManageSkills = canManageSkillMaster(session.user.role);
  const [categories, skills] = await Promise.all([
    listSkillCategories(),
    listSkills()
  ]);
  const activeSkillCount = skills.filter((skill) => skill.isActive).length;
  const assignedMemberCount = skills.reduce(
    (total, skill) => total + skill._count.memberSkills,
    0
  );

  return (
    <div className="space-y-6">
      <SkillPageHeader
        categories={categories}
        canManage={canManageSkills}
      />

      <section
        aria-label="スキル集計"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="登録スキル"
          value={skills.length}
          caption="有効・無効を含む"
          icon={BookOpenCheck}
          tone="teal"
        />
        <Metric
          label="有効なスキル"
          value={activeSkillCount}
          caption={`全体の ${skills.length === 0 ? 0 : Math.round((activeSkillCount / skills.length) * 100)}%`}
          icon={Activity}
          tone="green"
        />
        <Metric
          label="カテゴリ"
          value={categories.length}
          caption="表示順に整理"
          icon={FolderTree}
          tone="coral"
        />
        <Metric
          label="メンバー設定数"
          value={assignedMemberCount}
          caption="スキル保有の延べ件数"
          icon={UsersRound}
          tone="amber"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>スキル一覧</CardTitle>
          <CardDescription>
            キーワード、カテゴリ、状態を組み合わせて登録済みスキルを確認します。
          </CardDescription>
        </CardHeader>
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
