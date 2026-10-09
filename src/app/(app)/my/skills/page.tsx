import { Award, ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import {
  listMemberSkillAssessments,
  listMembers
} from "@/modules/members/application/member-service";
import { SkillAssessmentBatchForm } from "@/modules/members/presentation/skill-assessment-batch-form";
import { listSkills } from "@/modules/skills/application/skill-service";
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

export default async function MySkillsPage() {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    redirect("/login");
  }

  const [members, assessments, skills] = await Promise.all([
    listMembers(),
    listMemberSkillAssessments(session.user.memberId),
    listSkills()
  ]);
  const currentMember = members.find((member) => member.id === session.user.memberId);
  const pendingSkillIds = new Set(
    assessments
      .filter((assessment) => assessment.status === "PENDING")
      .map((assessment) => assessment.skillId)
  );
  const activeSkills = skills
    .filter((skill) => skill.isActive && !pendingSkillIds.has(skill.id))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      categoryName: skill.category.name
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="自分のスキル"
        description="複数のスキルと現在のレベルを設定し、まとめて承認申請できます。"
      />

      <Card>
        <CardHeader>
          <CardTitle>スキル一括申請</CardTitle>
          <CardDescription>
            スキルを追加してレベルを調整してください。承認待ちのスキルは選択肢から除外されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillAssessmentBatchForm
            key={Array.from(pendingSkillIds).sort().join(",")}
            skills={activeSkills}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>承認済みスキル</CardTitle>
            <CardDescription>現在の正式な保有スキルです。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentMember?.memberSkills.map((memberSkill) => (
              <div
                key={memberSkill.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {memberSkill.skill.name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {memberSkill.skill.category.name}
                  </p>
                </div>
                <Badge variant="success">Lv.{memberSkill.level}</Badge>
              </div>
            ))}
            {currentMember?.memberSkills.length === 0 ? (
              <EmptyState
                icon={Award}
                title="承認済みスキルはありません"
                description="上の申請フォームから最初のスキルを申請してください。"
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申告履歴</CardTitle>
            <CardDescription>これまでの申請と承認状況です。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                role="group"
                aria-label={`${assessment.skill.name}の申告履歴`}
                className="border-b border-[var(--border)] py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {assessment.skill.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {assessment.skill.category.name} / 申告Lv.{assessment.requestedLevel}
                    </p>
                  </div>
                  <Badge variant={assessment.status === "REJECTED" ? "danger" : assessment.status === "PENDING" ? "warning" : "success"}>
                    {statusLabels[assessment.status] ?? assessment.status}
                  </Badge>
                </div>
                {assessment.managerComment ? (
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    コメント: {assessment.managerComment}
                  </p>
                ) : null}
              </div>
            ))}
            {assessments.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="申告履歴はありません"
                description="申請を送信すると、ここで承認状況を確認できます。"
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
