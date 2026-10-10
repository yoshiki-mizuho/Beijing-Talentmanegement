export type ProfileViewer = { role: string; memberId: string };
export type VisibleMember = {
  id: string;
  managerId: string | null;
  status: string;
  isProfilePublic: boolean;
};

export function canViewProfile(viewer: ProfileViewer, member: VisibleMember) {
  if (viewer.role === "ADMIN") return true;
  if (member.status !== "ACTIVE") return false;
  return (
    member.isProfilePublic || viewer.memberId === member.id || member.managerId === viewer.memberId
  );
}

export type LevelChange = {
  skillId: string;
  skillName: string;
  fromLevel: number | null;
  toLevel: number;
  source: string;
  changedAt: Date | string;
};

export function aggregateTrendingSkills(
  changes: ReadonlyArray<LevelChange>,
  since: Date,
  limit = 8
) {
  const counts = new Map<string, { skillId: string; skillName: string; count: number }>();
  for (const change of changes) {
    if (change.source === "BACKFILL" || new Date(change.changedAt) < since) continue;
    if (change.fromLevel !== null && change.toLevel <= change.fromLevel) continue;
    const item = counts.get(change.skillId) ?? {
      skillId: change.skillId,
      skillName: change.skillName,
      count: 0
    };
    item.count += 1;
    counts.set(change.skillId, item);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.skillName.localeCompare(b.skillName, "ja"))
    .slice(0, limit);
}

export type RecommendationReason = "target" | "trending" | "department";

export function getRecommendationReasons(input: {
  candidate: {
    departmentId: string;
    skills: ReadonlyArray<{ skillId: string; level: number }>;
    recentLevelUp: boolean;
  };
  viewerDepartmentId: string;
  targetGapSkillIds: ReadonlySet<string>;
  trendingSkillIds: ReadonlySet<string>;
}) {
  const reasons: RecommendationReason[] = [];
  if (
    input.candidate.skills.some(
      (skill) => skill.level >= 4 && input.targetGapSkillIds.has(skill.skillId)
    )
  )
    reasons.push("target");
  if (
    input.candidate.skills.some(
      (skill) => skill.level >= 4 && input.trendingSkillIds.has(skill.skillId)
    )
  )
    reasons.push("trending");
  if (input.candidate.departmentId === input.viewerDepartmentId && input.candidate.recentLevelUp)
    reasons.push("department");
  return reasons;
}

export type Snapshot = {
  at: Date;
  skills: Array<{ skillId: string; skillName: string; level: number }>;
};
export type SnapshotMarker = { type: "new" | "up"; fromLevel?: number };

export function restoreSkillSnapshots(
  changes: ReadonlyArray<LevelChange>,
  points: ReadonlyArray<Date>
): Snapshot[] {
  return [...points]
    .sort((a, b) => a.getTime() - b.getTime())
    .flatMap((at) => {
      const latest = new Map<string, LevelChange>();
      for (const change of changes) {
        if (new Date(change.changedAt) > at) continue;
        const current = latest.get(change.skillId);
        if (!current || new Date(current.changedAt) < new Date(change.changedAt))
          latest.set(change.skillId, change);
      }
      if (latest.size === 0) return [];
      return [
        {
          at,
          skills: [...latest.values()]
            .filter((item) => item.toLevel > 0)
            .map((item) => ({
              skillId: item.skillId,
              skillName: item.skillName,
              level: item.toLevel
            }))
            .sort((a, b) => b.level - a.level || a.skillName.localeCompare(b.skillName, "ja"))
        }
      ];
    });
}

export function markSnapshotChanges(current: Snapshot, previous?: Snapshot) {
  const prior = new Map(previous?.skills.map((skill) => [skill.skillId, skill.level]) ?? []);
  return current.skills.map((skill) => {
    const before = prior.get(skill.skillId);
    const marker: SnapshotMarker | null =
      before === undefined
        ? { type: "new" }
        : skill.level > before
          ? { type: "up", fromLevel: before }
          : null;
    return { ...skill, marker };
  });
}

export function achievedRoleNames(
  skills: ReadonlyArray<{ skillId: string; level: number }>,
  roles: ReadonlyArray<{
    name: string;
    requirements: ReadonlyArray<{ skillId: string; requiredLevel: number }>;
  }>
) {
  const levels = new Map(skills.map((skill) => [skill.skillId, skill.level]));
  return roles
    .filter(
      (role) =>
        role.requirements.length > 0 &&
        role.requirements.every(
          (requirement) => (levels.get(requirement.skillId) ?? 0) >= requirement.requiredLevel
        )
    )
    .map((role) => role.name);
}
