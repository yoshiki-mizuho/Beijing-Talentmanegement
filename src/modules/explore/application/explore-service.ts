import { isGrowthLevelChange } from "@/modules/growth/domain/level-change-source";
import {
  achievedRoleNames,
  aggregateTrendingSkills,
  calculateProfileStats,
  canViewProfile,
  getRecommendationReasons,
  markSnapshotChanges,
  parseProfileInput,
  restoreSkillSnapshots,
  splitTopSkills,
  type ProfileViewer
} from "@/modules/explore/domain/explore-profile";
import {
  getExploreSourceData,
  getProfileVisibility,
  getSkillProfileSourceData,
  updateMemberProfile,
  updateProfileVisibility
} from "@/modules/explore/infrastructure/explore-repository";
import { badgeDefinitions, badgeRarities, secretBadgeArt } from "@/modules/growth/domain/badge-art";
import { calculateBadgeAchievements, calculateBadgeProgress } from "@/modules/growth/domain/growth-insights";
import { getBadgeCalculationData } from "@/modules/growth/infrastructure/badge-calculation-repository";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

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
  const targetEvaluation = evaluateRoleAchievement(
    (viewerMember?.targetRole?.roleRequirements ?? []).map((item) => ({ ...item, isRequired: true })),
    viewerMember?.memberSkills ?? []
  );
  const targetGapSkillIds = new Set(
    targetEvaluation.units.flatMap((unit) =>
      unit.satisfied ? [] : unit.kind === "single" ? [unit.requirement.skillId] : unit.requirements.map((item) => item.skillId)
    )
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
              avatarUpdatedAt: candidate.avatarUpdatedAt?.toISOString() ?? null,
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
                  avatarUpdatedAt: candidate.avatarUpdatedAt?.toISOString() ?? null,
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

  const [{ member, roles }, badgeData] = await Promise.all([
    getSkillProfileSourceData(memberId),
    getBadgeCalculationData(memberId)
  ]);
  const roleDefinitions = roles.map((role) => ({
    name: role.name,
    requirements: role.roleRequirements
  }));
  const skills = member.memberSkills
    .map((item) => ({
      skillId: item.skillId,
      skillName: item.skill.name,
      categoryName: item.skill.category.name,
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
  const markedSnapshots = restored.map((snapshot, index, all) => ({
    yearsAgo: historyPoints.find((point) => point.at.getTime() === snapshot.at.getTime())!.yearsAgo,
    at: snapshot.at.toISOString(),
    skills: markSnapshotChanges(snapshot, all[index - 1]),
    roles: achievedRoleNames(snapshot.skills, roleDefinitions)
  }));
  const snapshots = orderSkillHistorySnapshots(markedSnapshots);
  const badgeAchievements = calculateBadgeAchievements({ ...badgeData, now });
  const achievementById = new Map(badgeAchievements.map((item) => [item.id, item]));
  const progressById = new Map(calculateBadgeProgress({ ...badgeData, now })
    .map((item) => [item.id, item]));
  const badges = badgeDefinitions.map((definition) => {
    const earnedAt = achievementById.get(definition.id)?.earnedAt?.toISOString() ?? null;
    // 未獲得のシークレットは、名前・条件・絵をブラウザへ送らない
    const hiddenSecret = definition.group === "secret" && !earnedAt;
    return {
    ...definition,
    name: hiddenSecret ? "？？？" : definition.name,
    condition: hiddenSecret ? "" : definition.condition,
    art: hiddenSecret ? secretBadgeArt : definition.art,
    earnedAt,
    progress: viewer.memberId === memberId
      ? progressById.get(definition.id) ?? null
      : null,
    rarityLabel: badgeRarities[definition.rarity].label,
    frameColor: badgeRarities[definition.rarity].frame,
    backgroundColor: badgeRarities[definition.rarity].background
    };
  });
  const recent = [...changes]
    .filter(
      (change) =>
        isGrowthLevelChange(change.source) &&
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

  const targetEvaluation = member.targetRole
    ? evaluateRoleAchievement(
        member.targetRole.roleRequirements.map((requirement) => ({
          skillId: requirement.skillId,
          skillName: requirement.skill.name,
          requiredLevel: requirement.requiredLevel,
          anyOfGroup: requirement.anyOfGroup,
          isRequired: true
        })),
        skills
      )
    : null;
  const stats = calculateProfileStats({
    createdAt: member.createdAt,
    levelChanges: member.skillLevelChanges,
    receivedCheerCount: member.receivedCheers.length,
    receivedReactionCount: member.skillLevelChanges.reduce(
      (sum, change) => sum + change._count.reactions,
      0
    ),
    mentoredCheers: member.mentoredCheers,
    now
  });
  const skillGroups = splitTopSkills(skills);
  return {
    id: member.id,
    name: member.name,
    departmentName: member.department.name,
    jobTitle: member.jobTitle,
    isProfilePublic: member.isProfilePublic,
    avatarUpdatedAt: member.avatarUpdatedAt?.toISOString() ?? null,
    profileMessage: member.profileMessage,
    consultTopics: member.consultTopics,
    skills,
    topSkills: skillGroups.top,
    otherSkills: skillGroups.rest,
    achievedRoles: achievedRoleNames(skills, roleDefinitions),
    badges,
    stats,
    targetRole: member.targetRole
      ? { name: member.targetRole.name, evaluation: targetEvaluation! }
      : null,
    recent,
    snapshots,
    chatUrl
  };
}

export async function updateMyProfile(
  memberId: string,
  input: { profileMessage: string; consultTopics: string[] }
) {
  const parsed = parseProfileInput(input);
  return updateMemberProfile(memberId, parsed);
}

export function orderSkillHistorySnapshots<T extends { yearsAgo: number }>(
  snapshots: ReadonlyArray<T>
) {
  return [...snapshots].sort((left, right) => left.yearsAgo - right.yearsAgo);
}

export function setProfileVisibility(memberId: string, isPublic: boolean) {
  return updateProfileVisibility(memberId, isPublic);
}
