import { listPendingSkillAssessments } from "@/modules/members/application/member-service";
import { SkillApprovalList } from "@/modules/members/presentation/skill-approval-list";
import {
  formatSkillApprovalDate,
  getSkillApprovalWaitingDays,
  type SkillApprovalRow
} from "@/modules/members/presentation/skill-approval";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function SkillApprovalsPage() {
  const session = await requirePageRoles(managerOrAdmin);
  const assessments = await listPendingSkillAssessments(
    session.user.role,
    session.user.memberId
  );
  const now = new Date();
  const rows: SkillApprovalRow[] = assessments.map((assessment) => {
    const currentSkill = assessment.member.memberSkills.find(
      (memberSkill) => memberSkill.skillId === assessment.skillId
    );
    const targetRequirement = assessment.member.targetRole?.roleRequirements.find(
      (requirement) => requirement.skillId === assessment.skillId
    );

    return {
      id: assessment.id,
      memberId: assessment.memberId,
      memberName: assessment.member.name,
      departmentName: assessment.member.department.name,
      jobTitle: assessment.member.jobTitle,
      skillName: assessment.skill.name,
      categoryName: assessment.skill.category.name,
      currentLevel: currentSkill?.level ?? null,
      requestedLevel: assessment.requestedLevel,
      yearsOfExperience: assessment.yearsOfExperience?.toString() ?? null,
      submittedAt: assessment.createdAt.toISOString(),
      submittedDateLabel: formatSkillApprovalDate(assessment.createdAt),
      waitingDays: getSkillApprovalWaitingDays(assessment.createdAt, now),
      targetRequiredLevel: targetRequirement?.requiredLevel ?? null
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="スキル承認"
        description={
          session.user.role === "ADMIN"
            ? "すべての申請です。待ち日数の長いものから並んでいます。"
            : "部下からの申請です。待ち日数の長いものから並んでいます。"
        }
      />
      <SkillApprovalList rows={rows} />
    </div>
  );
}
