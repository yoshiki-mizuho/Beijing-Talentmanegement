import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { getMemberSkillSheetContext } from "@/modules/members/application/member-service";
import { SkillSheetForm } from "@/modules/members/presentation/skill-sheet-form";
import {
  buildSkillSheetRows,
  selectSkillSheetEncouragement
} from "@/modules/members/presentation/skill-sheet";
import {
  listActiveSkillsForSkillSheet,
  listSkillLevels
} from "@/modules/skills/application/skill-service";
import { getCurrentSession } from "@/server/auth/session";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

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

export default async function MySkillsPage() {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    redirect("/login");
  }

  const [context, skills, levels] = await Promise.all([
    getMemberSkillSheetContext(session.user.memberId),
    listActiveSkillsForSkillSheet(),
    listSkillLevels()
  ]);
  const rows = buildSkillSheetRows({
    skills,
    memberSkills: context.memberSkills,
    pendingAssessments: context.pendingAssessments,
    targetRequirements: context.targetRequirements
  });
  const encouragement = selectSkillSheetEncouragement(
    context.assessmentHistory[0]?.createdAt ?? null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="スキル申請"
        title="スキルシート申請"
        description="今のスキルを見渡し、変化したレベルだけをまとめて申請できます。"
      />

      <Card>
        <CardHeader>
          <CardTitle>スキルとレベルを選ぶ</CardTitle>
          <CardDescription>
            現在のレベルと定義を確認し、申請したいレベルを1回押してください。
            {context.targetRoleName
              ? ` 目標ロール「${context.targetRoleName}」の必要レベルも表示しています。`
              : " 目標ロールを設定すると、必要なレベルもここに表示されます。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>申告履歴</CardTitle>
          <CardDescription>新しい申請から10件を表示しています。</CardDescription>
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
                aria-label={`${assessment.skill.name}の申告履歴`}
                className="border-b border-[var(--border)] py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {assessment.skill.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {assessment.skill.category.name} / 申請日 {dateFormatter.format(assessment.createdAt)} / 申告 Lv{assessment.requestedLevel}
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
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    マネージャーコメント: {assessment.managerComment}
                  </p>
                ) : null}
              </div>
            );
          })}
          {context.assessmentHistory.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="申告履歴はありません"
              description="レベルを選んで申請すると、ここで承認状況を確認できます。"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
