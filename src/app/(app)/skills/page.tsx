import {
  listSkillCategories,
  listSkillCategoryGroups,
  listSkillLevels,
  listSkills
} from "@/modules/skills/application/skill-service";
import { Card, CardContent } from "@/shared/ui/card";
import { SkillPageHeader } from "@/modules/skills/presentation/skill-page-header";
import { SkillSearchTable } from "@/modules/skills/presentation/skill-search-table";
import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";
import Link from "next/link";
import type { Route } from "next";
import { SkillCategoryGroupsPanel } from "@/modules/skills/presentation/skill-category-groups-panel";

export const dynamic = "force-dynamic";

export default async function SkillsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const query = await searchParams;
  const activeTab = query.tab === "groups" ? "groups" : "skills";
  const session = await requirePageRoles(adminOnly);
  const canManageSkills = canManageSkillMaster(session.user.role);
  const [categories, skills, levels, groups] = await Promise.all([
    listSkillCategories(),
    listSkills(),
    listSkillLevels(),
    listSkillCategoryGroups()
  ]);
  return (
    <div className="space-y-6">
      <SkillPageHeader
        categories={categories}
        canManage={canManageSkills}
        skillCount={skills.length}
        levels={levels}
      />
      <div role="tablist" aria-label="スキル管理" className="flex gap-1 border-b border-[var(--border)]">
        {[
          { id: "skills", label: "スキル", href: "/skills" },
          { id: "groups", label: "大分類", href: "/skills?tab=groups" }
        ].map((tab) => (
          <Link
            key={tab.id}
            href={tab.href as Route}
            role="tab"
            aria-selected={activeTab === tab.id}
            className="inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm font-semibold text-[var(--muted-foreground)] aria-selected:border-[var(--primary)] aria-selected:text-[var(--primary)]"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {activeTab === "skills" ? <Card>
        <CardContent className="pt-5">
          <SkillSearchTable
            initialSkills={skills}
            categories={categories}
            levels={levels}
            canManage={canManageSkills}
          />
        </CardContent>
      </Card> : null}
      {activeTab === "groups" ? (
        <SkillCategoryGroupsPanel initialGroups={groups} categories={categories} />
      ) : null}
    </div>
  );
}
