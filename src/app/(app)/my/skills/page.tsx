import { redirect } from "next/navigation";

import {
  listMemberSkillAssessments,
  listMembers
} from "@/modules/members/application/member-service";
import { createSkillAssessmentAction } from "@/modules/members/presentation/actions";
import { listSkills } from "@/modules/skills/application/skill-service";
import { getCurrentSession } from "@/server/auth/session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

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
  const activeSkills = skills.filter((skill) => skill.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">自分のスキル申告</h1>
        <p className="mt-1 text-sm text-slate-600">
          保有スキルを申告し、managerの承認を依頼します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新規申告</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSkillAssessmentAction} className="grid gap-3 md:grid-cols-[1fr_140px_160px_auto]">
            <div>
              <Label htmlFor="skillId">スキル</Label>
              <select
                id="skillId"
                name="skillId"
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                required
              >
                {activeSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.category.name} / {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="requestedLevel">申告Lv</Label>
              <select
                id="requestedLevel"
                name="requestedLevel"
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                required
              >
                {skillLevels.map((level) => (
                  <option key={level} value={level}>
                    Lv.{level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="yearsOfExperience">経験年数</Label>
              <Input
                id="yearsOfExperience"
                name="yearsOfExperience"
                type="number"
                step="0.1"
                min="0"
                max="99.9"
                className="mt-1 w-full"
              />
            </div>
            <div className="self-end">
              <Button type="submit">申告</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>承認済みスキル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentMember?.memberSkills.map((memberSkill) => (
              <div key={memberSkill.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-950">
                  {memberSkill.skill.name}
                </p>
                <p className="text-sm text-slate-600">
                  {memberSkill.skill.category.name} / Lv.{memberSkill.level}
                </p>
              </div>
            ))}
            {currentMember?.memberSkills.length === 0 && (
              <p className="text-sm text-slate-600">承認済みスキルはまだありません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申告履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {assessment.skill.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {assessment.skill.category.name} / 申告Lv.{assessment.requestedLevel}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
                    {assessment.status}
                  </span>
                </div>
                {assessment.managerComment && (
                  <p className="mt-2 text-sm text-slate-600">
                    コメント: {assessment.managerComment}
                  </p>
                )}
              </div>
            ))}
            {assessments.length === 0 && (
              <p className="text-sm text-slate-600">申告履歴はまだありません。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
