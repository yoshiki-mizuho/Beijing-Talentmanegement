import { ClipboardList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMemberSkillSheetContext } from "@/modules/members/application/member-service";
import { SkillSheetForm } from "@/modules/members/presentation/skill-sheet-form";
import {
  buildSkillSheetRows,
  selectSkillSheetEncouragement
} from "@/modules/members/presentation/skill-sheet";
import {
  listActiveSkillsForSkillSheet,
  listPopularSkillsForMember,
  listSkillLevels
} from "@/modules/skills/application/skill-service";
import { getCurrentSession } from "@/server/auth/session";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING: "承認待ち",
  APPROVED: "承認済み",
  CORRECTED: "補正承認",
  REJECTED: "差し戻し"
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Tokyo"
});

export default async function MySkillsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getCurrentSession();
  const query = await searchParams;
  const activeTab = query.tab === "history" ? "history" : "apply";

  if (!session?.user.memberId) {
    redirect("/login");
  }

  const [context, skills, levels, popularSkills] = await Promise.all([
    getMemberSkillSheetContext(session.user.memberId),
    listActiveSkillsForSkillSheet(),
    listSkillLevels(),
    listPopularSkillsForMember(session.user.memberId)
  ]);
  const rows = buildSkillSheetRows({
    skills,
    memberSkills: context.memberSkills,
    pendingAssessments: context.pendingAssessments,
    targetRequirements: context.targetRequirements,
    latestAssessments: context.latestAssessments
  });
  const encouragement = selectSkillSheetEncouragement(
    context.assessmentHistory[0]?.createdAt ?? null
  );
  const initial = context.memberSkills.length === 0 &&
    context.pendingAssessments.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="sr-only">スキル申請</h1>
      <div
        role="tablist"
        aria-label="自分のスキル"
        className="flex gap-1 border-b border-[var(--border)]"
      >
        {[
          { id: "apply", label: "申請", href: "/my/skills" },
          { id: "history", label: "申請履歴", href: "/my/skills?tab=history" }
        ].map((tab) => (
          <Link
            key={tab.id}
            id={`my-skills-${tab.id}-tab`}
            href={tab.href as Route}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`my-skills-${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            data-selected={activeTab === tab.id}
            className="inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm font-semibold text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] data-[selected=true]:border-[var(--primary)] data-[selected=true]:text-[var(--primary)]"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "apply" ? (
        <Card
          id="my-skills-apply-panel"
          role="tabpanel"
          aria-labelledby="my-skills-apply-tab"
        >
          <CardContent className="pt-6">
            <SkillSheetForm
              key={context.pendingAssessments
                .map((assessment) => assessment.skillId)
                .sort()
                .join(",")}
              rows={rows}
              levels={levels.map((level) => ({
                level: level.level,
                description: level.description
              }))}
              encouragement={encouragement}
              initial={initial}
              popularSkillIds={popularSkills.skillIds}
              popularHeading={popularSkills.departmentName
                ? `${popularSkills.departmentName}でよく登録されているスキル`
                : "よく登録されているスキル"}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "history" ? (
        <Card
          id="my-skills-history-panel"
          role="tabpanel"
          aria-labelledby="my-skills-history-tab"
        >
          <CardHeader>
            <CardTitle>申請履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
          {context.assessmentHistory.map((assessment) => {
            const approvedLevel = assessment.skillLevelChanges[0]?.toLevel ??
              (assessment.status === "APPROVED"
                ? assessment.requestedLevel
                : null);

            return (
              <div
                key={assessment.id}
                role="group"
                aria-label={`${assessment.skill.name}の申請履歴`}
                className="border-b border-[var(--border)] py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {assessment.skill.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {assessment.skill.category.name} / 申請日 {dateFormatter.format(assessment.createdAt)} / 申請 Lv{assessment.requestedLevel}
                    </p>
                  </div>
                  <Badge
                    variant={
                      assessment.status === "REJECTED"
                        ? "danger"
                        : assessment.status === "PENDING"
                          ? "warning"
                          : "success"
                    }
                  >
                    {statusLabels[assessment.status] ?? assessment.status}
                  </Badge>
                </div>
                {approvedLevel !== null ? (
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {assessment.status === "CORRECTED"
                      ? `Lv${approvedLevel} に補正`
                      : `承認レベル Lv${approvedLevel}`}
                  </p>
                ) : null}
                {assessment.managerComment ? (
                  <p
                    className={
                      assessment.status === "REJECTED"
                        ? "mt-3 rounded-lg border border-[var(--destructive)]/30 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-[var(--destructive)]"
                        : "mt-2 text-sm leading-6 text-[var(--muted-foreground)]"
                    }
                  >
                    {assessment.status === "REJECTED"
                      ? `差し戻しの理由：${assessment.managerComment}`
                      : `マネージャーコメント: ${assessment.managerComment}`}
                  </p>
                ) : null}
              </div>
            );
          })}
          {context.assessmentHistory.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="申請履歴はありません"
              description="レベルを選んで申請すると、ここで承認状況を確認できます。"
            />
          ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
