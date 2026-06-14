import { SkillSelfAssessmentStatus } from "@prisma/client";

import { listPendingSkillAssessments } from "@/modules/members/application/member-service";
import { reviewSkillAssessmentAction } from "@/modules/members/presentation/actions";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

export default async function SkillApprovalsPage() {
  const assessments = await listPendingSkillAssessments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">スキル承認</h1>
        <p className="mt-1 text-sm text-slate-600">
          メンバーからのスキル申告を承認、補正承認、差し戻しします。
        </p>
      </div>

      <div className="grid gap-4">
        {assessments.map((assessment) => (
          <Card key={assessment.id}>
            <CardHeader>
              <CardTitle>
                {assessment.member.name} / {assessment.skill.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={reviewSkillAssessmentAction} className="grid gap-3 md:grid-cols-[1fr_140px_2fr_auto_auto_auto]">
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
                <div>
                  <Label htmlFor={`corrected-${assessment.id}`}>補正Lv</Label>
                  <select
                    id={`corrected-${assessment.id}`}
                    name="correctedLevel"
                    defaultValue={assessment.requestedLevel}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  >
                    {skillLevels.map((level) => (
                      <option key={level} value={level}>
                        Lv.{level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`comment-${assessment.id}`}>コメント</Label>
                  <Input
                    id={`comment-${assessment.id}`}
                    name="managerComment"
                    className="mt-1 w-full"
                  />
                </div>
                <ReviewButton status={SkillSelfAssessmentStatus.APPROVED}>
                  承認
                </ReviewButton>
                <ReviewButton status={SkillSelfAssessmentStatus.CORRECTED}>
                  補正承認
                </ReviewButton>
                <ReviewButton status={SkillSelfAssessmentStatus.REJECTED}>
                  差し戻し
                </ReviewButton>
              </form>
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
  return (
    <Button type="submit" name="status" value={status}>
      {children}
    </Button>
  );
}
