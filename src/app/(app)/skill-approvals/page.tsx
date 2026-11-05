import {
  getSkillApprovalInsightContext,
  listPendingSkillAssessments
} from "@/modules/members/application/member-service";
import { getApprovalCheckPoints } from "@/modules/members/domain/approval-check-points";
import { buildApprovalLevelDistribution } from "@/modules/members/domain/approval-level-distribution";
import { SkillApprovalList } from "@/modules/members/presentation/skill-approval-list";
import {
  formatSkillApprovalDate,
  getSkillApprovalWaitingDays,
  type SkillApprovalRow
} from "@/modules/members/presentation/skill-approval";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";
import { listSkillPrerequisitesBySkillIds } from "@/modules/skills/application/skill-service";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function SkillApprovalsPage() {
  const session = await requirePageRoles(managerOrAdmin);
  const assessments = await listPendingSkillAssessments(
    session.user.role,
    session.user.memberId
  );
  const [prerequisites, insightContext] = await Promise.all([
    listSkillPrerequisitesBySkillIds([
      ...new Set(assessments.map((assessment) => assessment.skillId))
    ]),
    getSkillApprovalInsightContext(assessments)
  ]);
  const now = new Date();
  const rows: SkillApprovalRow[] = assessments.map((assessment) => {
    const currentSkill = assessment.member.memberSkills.find(
      (memberSkill) => memberSkill.skillId === assessment.skillId
    );
    const targetRequirement = assessment.member.targetRole?.roleRequirements.find(
      (requirement) => requirement.skillId === assessment.skillId
    );
    const history = insightContext.history.filter(
      (item) => item.memberId === assessment.memberId
        && item.skillId === assessment.skillId
    );
    const prerequisiteItems = prerequisites
      .filter((item) => item.skillId === assessment.skillId)
      .map((item) => ({
        name: item.prerequisiteSkill.name,
        currentLevel: assessment.member.memberSkills.find(
          (memberSkill) => memberSkill.skillId === item.prerequisiteSkillId
        )?.level ?? null
      }));
    const distributionMembers = insightContext.peers.map((member) => ({
      id: member.id,
      departmentId: member.departmentId,
      targetRoleId: member.targetRoleId,
      level: member.memberSkills.find(
        (memberSkill) => memberSkill.skillId === assessment.skillId
      )?.level ?? null
    }));
    const departmentDistribution = buildApprovalLevelDistribution(
      distributionMembers.filter(
        (member) => member.departmentId === assessment.member.departmentId
      ),
      assessment.memberId
    );
    const targetRoleDistribution = assessment.member.targetRole
      ? buildApprovalLevelDistribution(
          distributionMembers.filter(
            (member) => member.targetRoleId === assessment.member.targetRole?.id
          ),
          assessment.memberId
        )
      : null;

    return {
      id: assessment.id,
      memberId: assessment.memberId,
      memberName: assessment.member.name,
      avatarUpdatedAt: assessment.member.avatarUpdatedAt?.toISOString() ?? null,
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
      targetRequiredLevel: targetRequirement?.requiredLevel ?? null,
      applicantComment: assessment.applicantComment,
      checkPoints: getApprovalCheckPoints({
        requestedLevel: assessment.requestedLevel,
        currentLevel: currentSkill?.level ?? null,
        prerequisites: prerequisiteItems,
        previousAssessment: history[0] ?? null,
        submittedAt: assessment.createdAt
      }),
      departmentDistribution,
      targetRoleDistribution,
      history: history.slice(0, 3).map((item) => ({
        id: item.id,
        dateLabel: formatSkillApprovalDate(item.createdAt),
        requestedLevel: item.requestedLevel,
        resultLabel: getAssessmentResultLabel(item.status)
      }))
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

function getAssessmentResultLabel(status: string) {
  if (status === "APPROVED") return "承認";
  if (status === "CORRECTED") return "補正承認";
  return "差し戻し";
}
