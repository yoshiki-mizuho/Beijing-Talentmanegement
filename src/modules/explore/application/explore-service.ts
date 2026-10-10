import {
  achievedRoleNames,
  aggregateTrendingSkills,
  canViewProfile,
  getRecommendationReasons,
  markSnapshotChanges,
  restoreSkillSnapshots,
  type ProfileViewer
} from "@/modules/explore/domain/explore-profile";
import {
  getExploreSourceData,
  getProfileVisibility,
  getSkillProfileSourceData,
  updateProfileVisibility
} from "@/modules/explore/infrastructure/explore-repository";
import { badgeDefinitions, badgeRarities } from "@/modules/growth/domain/badge-art";
import { calculateBadgeAchievements } from "@/modules/growth/domain/growth-insights";

export async function getExploreData(
  viewer: ProfileViewer,
  filters: { skillId?: string; level: number },
  now = new Date()
) {
  const since = new Date(now);
  since.setDate(since.getDate() - 30);
  const { viewerMember, skills, changes, candidates } = await getExploreSourceData(viewer, since);
  const normalizedChanges = changes.map((change) => ({
    ...change,
    skillName: change.skill.name
  }));
  const trending = aggregateTrendingSkills(normalizedChanges, since).map((item) => ({
    ...item,
    categoryName:
      changes.find((change) => change.skillId === item.skillId)?.skill.category.name ?? ""
  }));
  const currentLevels = new Map(
    viewerMember?.memberSkills.map((item) => [item.skillId, item.level]) ?? []
  );
  const targetGapSkillIds = new Set(
    (viewerMember?.targetRole?.roleRequirements ?? [])
      .filter((item) => (currentLevels.get(item.skillId) ?? 0) < item.requiredLevel)
      .map((item) => item.skillId)
  );
  const trendingSkillIds = new Set(trending.map((item) => item.skillId));
  const recommendations = candidates
    .flatMap((candidate) => {
      const reasons = getRecommendationReasons({
        candidate: {
          departmentId: candidate.departmentId,
          skills: candidate.memberSkills,
          recentLevelUp: candidate.skillLevelChanges.some(
            (change) => change.fromLevel === null || change.toLevel > change.fromLevel
          )
        },
        viewerDepartmentId: viewerMember?.departmentId ?? "",
        targetGapSkillIds,
        trendingSkillIds
      });
      return reasons.length
        ? [
            {
              id: candidate.id,
              name: candidate.name,
              departmentName: candidate.department.name,
              jobTitle: candidate.jobTitle,
              reasons,
              strengths: candidate.memberSkills
                .filter((item) => item.level >= 4)
                .sort((left, right) => right.level - left.level)
                .slice(0, 3)
                .map((item) => ({ name: item.skill.name, level: item.level }))
            }
          ]
        : [];
    })
    .slice(0, 6);
  const results = filters.skillId
    ? candidates
        .flatMap((candidate) => {
          const skill = candidate.memberSkills.find(
            (item) => item.skillId === filters.skillId && item.level >= filters.level
          );
          return skill
            ? [
                {
                  id: candidate.id,
                  name: candidate.name,
                  departmentName: candidate.department.name,
                  jobTitle: candidate.jobTitle,
                  level: skill.level
                }
              ]
            : [];
        })
        .sort(
          (left, right) => right.level - left.level || left.name.localeCompare(right.name, "ja")
        )
    : [];

  return { skills, trending, recommendations, results };
}

export async function getSkillProfile(viewer: ProfileViewer, memberId: string, now = new Date()) {
  const guard = await getProfileVisibility(memberId);
  if (!guard || !canViewProfile(viewer, guard)) return null;

  const { member, roles } = await getSkillProfileSourceData(memberId);
  const roleDefinitions = roles.map((role) => ({
    name: role.name,
    requirements: role.roleRequirements
  }));
  const skills = member.memberSkills
    .map((item) => ({
      skillId: item.skillId,
      skillName: item.skill.name,
      level: item.level
    }))
    .sort(
      (left, right) =>
        right.level - left.level || left.skillName.localeCompare(right.skillName, "ja")
    );
  const changes = member.skillLevelChanges.map((item) => ({
    ...item,
    skillName: item.skill.name
  }));
  const historyPoints = [5, 3, 1].map((yearsAgo) => {
    const at = new Date(now);
    at.setFullYear(at.getFullYear() - yearsAgo);
    return { yearsAgo, at };
  });
  const restored = restoreSkillSnapshots(
    changes,
    historyPoints.map((point) => point.at)
  );
  const snapshots = restored.map((snapshot, index, all) => ({
    yearsAgo: historyPoints.find((point) => point.at.getTime() === snapshot.at.getTime())!.yearsAgo,
    at: snapshot.at.toISOString(),
    skills: markSnapshotChanges(snapshot, all[index - 1]),
    roles: achievedRoleNames(snapshot.skills, roleDefinitions)
  }));
  const badgeAchievements = calculateBadgeAchievements({
    assessments: member.selfAssessments,
    memberSkills: member.memberSkills,
    levelChanges: changes,
    targetRequirements: member.targetRole?.roleRequirements ?? [],
    mentoredCheers: member.mentoredCheers
  });
  const badges = badgeAchievements.flatMap((achievement) => {
    const definition = badgeDefinitions.find((item) => item.id === achievement.id);
    return achievement.earnedAt && definition
      ? [
          {
            ...definition,
            rarityLabel: badgeRarities[definition.rarity].label,
            frameColor: badgeRarities[definition.rarity].frame,
            backgroundColor: badgeRarities[definition.rarity].background
          }
        ]
      : [];
  });
  const recent = [...changes]
    .filter(
      (change) =>
        change.source !== "BACKFILL" &&
        (change.fromLevel === null || change.toLevel > change.fromLevel)
    )
    .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
    .slice(0, 5)
    .map((item) => ({
      skillName: item.skillName,
      fromLevel: item.fromLevel,
      toLevel: item.toLevel,
      changedAt: item.changedAt.toISOString()
    }));
  const template = process.env.CHAT_LINK_TEMPLATE;
  const chatUrl = template?.includes("{email}")
    ? template.replaceAll("{email}", encodeURIComponent(member.email))
    : null;

  return {
    id: member.id,
    name: member.name,
    departmentName: member.department.name,
    jobTitle: member.jobTitle,
    isProfilePublic: member.isProfilePublic,
    skills,
    achievedRoles: achievedRoleNames(skills, roleDefinitions),
    badges,
    recent,
    snapshots,
    chatUrl
  };
}

export function setProfileVisibility(memberId: string, isPublic: boolean) {
  return updateProfileVisibility(memberId, isPublic);
}
