import {
  aggregateMissingSkills,
  findAlmostThereMembers,
  parseDashboardMonth,
  type TeamMemberSnapshot
} from "@/modules/dashboard/domain/team-dashboard";
import {
  countSkillExperts,
  getTeamDashboardData,
  isPendingAssessment
} from "@/modules/dashboard/infrastructure/team-dashboard-repository";
import { getLevelUpFeed, listSkillMentorCandidates } from "@/modules/growth/application/growth-service";

export async function getTeamDashboard(
  managerMemberId: string,
  monthValue?: string,
  now: Date = new Date()
) {
  const month = parseDashboardMonth(monthValue, now);
  const data = await getTeamDashboardData(managerMemberId);
  if (!data) return null;

  const members: TeamMemberSnapshot[] = data.reports.map((member) => ({
    id: member.id,
    name: member.name,
    createdAt: member.createdAt,
    targetRole: member.targetRole
      ? {
          name: member.targetRole.name,
          roleRequirements: member.targetRole.roleRequirements.map((requirement) => ({
            skillId: requirement.skillId,
            skillName: requirement.skill.name,
            requiredLevel: requirement.requiredLevel
          }))
        }
      : null,
    memberSkills: member.memberSkills,
    pendingAssessments: member.selfAssessments
      .filter((assessment) => isPendingAssessment(assessment.status))
      .map((assessment) => ({ skillId: assessment.skillId })),
    assessmentDates: member.selfAssessments.map((assessment) => assessment.createdAt),
    levelChangeDates: member.skillLevelChanges.map((change) => change.changedAt)
  }));
  const memberIds = members.map((member) => member.id);
  const topMissingSkill = aggregateMissingSkills(members)[0];
  const almostThere = findAlmostThereMembers(members);
  const [feed, topMissingSkillExpertCount, mentorSkills] = await Promise.all([
    getLevelUpFeed({
      memberIds,
      viewerMemberId: managerMemberId,
      start: month.start,
      end: month.end,
      limit: 10
    }),
    topMissingSkill ? countSkillExperts(topMissingSkill.skillId) : Promise.resolve(0),
    listSkillMentorCandidates([...new Set(almostThere.map((item) => item.skillId))])
  ]);

  return {
    manager: {
      id: data.id,
      name: data.name,
      departmentName: data.department.name
    },
    members,
    month,
    pendingAssessments: data.reports.flatMap((member) =>
      member.selfAssessments.flatMap((assessment) =>
        isPendingAssessment(assessment.status)
          ? [{ memberId: member.id, createdAt: assessment.createdAt }]
          : []
      )
    ),
    levelChanges: data.reports.flatMap((member) =>
      member.skillLevelChanges.map((change) => ({ memberId: member.id, ...change }))
    ),
    feed,
    topMissingSkillExpertCount,
    mentorSkills,
    recentCheers: data.sentCheers.filter((cheer) =>
      cheer.createdAt >= new Date(now.getTime() - 30 * 86_400_000)
    ),
    openOneOnOneMemberIds: [...new Set(data.managedOneOnOneNotes.map((note) => note.memberId))],
    now
  };
}

export type TeamDashboardResult = NonNullable<Awaited<ReturnType<typeof getTeamDashboard>>>;
