import { SkillSelfAssessmentStatus } from "@prisma/client";

import { listPendingSkillAssessments } from "@/modules/members/application/member-service";
import { reviewSkillAssessmentAction } from "@/modules/members/presentation/actions";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, SelectField } from "@/shared/ui/form-field";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

export default async function SkillApprovalsPage() {
  const assessments = await listPendingSkillAssessments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="スキル承認"
        description="メンバーからのスキル申告を承認、補正承認、差し戻しします。"
      />

      <div className="grid gap-4">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            role="group"
            aria-label={`${assessment.member.name} / ${assessment.skill.name}の承認`}
          >
            <CardHeader>
              <CardTitle>
                {assessment.member.name} / {assessment.skill.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={reviewSkillAssessmentAction} className="grid gap-3 md:grid-cols-[1fr_140px_2fr_auto_auto_auto] md:items-end">
                <input type="hidden" name="assessmentId" value={assessment.id} />
                <div>
                  <p className="text-sm font-medium text-slate-950">
                    申告Lv.{assessment.requestedLevel}
                  </p>
                  <p className="text-sm text-slate-600">
                    {assessment.member.department.name} /{" "}
                    {assessment.member.jobTitle ?? "役職未設定"}
                  </p>
                </div>
                <SelectField
                    id={`corrected-${assessment.id}`}
                    label="補正レベル"
                    name="correctedLevel"
                    defaultValue={assessment.requestedLevel}
                  >
                    {skillLevels.map((level) => (
                      <option key={level} value={level}>
                        Lv.{level}
                      </option>
                    ))}
                  </SelectField>
                <FormField
                    id={`comment-${assessment.id}`}
                    label="コメント（差し戻し時は必須）"
                    name="managerComment"
                    description="差し戻す場合は、メンバーが次に取れる行動を具体的に記載してください。"
                />
                <ReviewButton status={SkillSelfAssessmentStatus.APPROVED}>
                  承認
                </ReviewButton>
                <ReviewButton status={SkillSelfAssessmentStatus.CORRECTED}>
                  補正承認
                </ReviewButton>
                <ReviewButton status={SkillSelfAssessmentStatus.REJECTED}>
                  差し戻し
                </ReviewButton>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
        {assessments.length === 0 && (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-600">承認待ちの申告はありません。</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReviewButton({
  status,
  children
}: {
  status: SkillSelfAssessmentStatus;
  children: React.ReactNode;
}) {
  if (status === SkillSelfAssessmentStatus.REJECTED) {
    return (
      <ConfirmSubmitButton
        name="status"
        value={status}
        pendingLabel="差し戻し中…"
        variant="destructive"
        confirm={{
          title: "スキル申請を差し戻しますか",
          description: "入力したコメントとともに申請を差し戻します。",
          confirmLabel: "差し戻す",
          destructive: true
        }}
      >
        {children}
      </ConfirmSubmitButton>
    );
  }

  return (
    <SubmitButton
      name="status"
      value={status}
      pendingLabel={status === SkillSelfAssessmentStatus.CORRECTED ? "補正承認中…" : "承認中…"}
    >
      {children}
    </SubmitButton>
  );
}
