import { getMemberGrowthData } from "@/modules/growth/application/growth-service";
import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";
import { listActiveSkillsForReminders } from "@/modules/dashboard/infrastructure/member-dashboard-repository";
import { getBadgeCalculationData } from "@/modules/growth/application/badge-service";
import { listMemberRoleAchievements } from "@/modules/roles/application/role-achievement-service";
import { resolveMemberProfiles } from "@/modules/members/application/member-directory";
import { getDirectLeaderIds, getUsers } from "@/server/platform/directory";

export async function getMemberDashboard(memberId: string) {
  const [growthData, badgeData, achievements, skills] = await Promise.all([
    getMemberGrowthData(memberId),
    getBadgeCalculationData(memberId),
    listMemberRoleAchievements(memberId),
    listActiveSkillsForReminders()
  ]);
  const profileIds = [
    memberId,
    ...growthData.mentorCandidates.map((member) => member.id),
    ...growthData.receivedCheers.flatMap((cheer) => [
      cheer.fromMember.id,
      cheer.mentorMember?.id,
    ]),
  ].filter((id): id is string => Boolean(id));
  const memberProfiles = await resolveMemberProfiles(profileIds);
  const managerName = await resolveDirectLeaderName(
    memberProfiles.get(memberId)?.platformUserId ?? null
  );
  return {
    ...growthData,
    managerName,
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

// 上司は基盤の組織で、本人の所属するノードのリーダー。基盤が応答しなくても画面は出す。
async function resolveDirectLeaderName(platformUserId: string | null) {
  if (!platformUserId) return null;
  try {
    const leaderIds = await getDirectLeaderIds(platformUserId);
    const leaderId = leaderIds.find((id) => id !== platformUserId);
    if (!leaderId) return null;
    const users = await getUsers([leaderId]);
    return users.get(leaderId)?.name || null;
  } catch {
    return null;
  }
}
