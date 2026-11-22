import { getMemberGrowthData } from "@/modules/growth/application/growth-service";
import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";
import { listActiveSkillsForReminders } from "@/modules/dashboard/infrastructure/member-dashboard-repository";
import { getBadgeCalculationData } from "@/modules/growth/application/badge-service";
import { listMemberRoleAchievements } from "@/modules/roles/application/role-achievement-service";
import { resolveMemberProfiles } from "@/modules/members/application/member-directory";

export async function getMemberDashboard(memberId: string) {
  const [growthData, badgeData, achievements, skills] = await Promise.all([
    getMemberGrowthData(memberId),
    getBadgeCalculationData(memberId),
    listMemberRoleAchievements(memberId),
    listActiveSkillsForReminders()
  ]);
  const profileIds = [
    memberId,
    growthData.member?.manager?.id,
    ...growthData.mentorCandidates.map((member) => member.id),
    ...growthData.receivedCheers.flatMap((cheer) => [
      cheer.fromMember.id,
      cheer.mentorMember?.id,
    ]),
  ].filter((id): id is string => Boolean(id));
  const memberProfiles = await resolveMemberProfiles(profileIds);
  return {
    ...growthData,
    // 基盤に居ない人は、教えてもらえそうな人に出さない。
    mentorCandidates: growthData.mentorCandidates.filter(
      (member) => !memberProfiles.get(member.id)?.missingOnPlatform
    ),
    memberProfiles,
    roleAchievements: achievements,
    badgeData: { ...badgeData, targetAchievements: achievements },
    skillReminders: buildSkillReminderCards({
      skills,
      memberSkills: growthData.member?.memberSkills ?? [],
      assessments: badgeData.assessments,
      levelChanges: badgeData.levelChanges
    })
  };
}
