export type MemberRow = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  email: string;
  profile: string | null;
  status: string;
  nodeId: string | null;
  organizationNode: {
    id: string;
    name: string;
  } | null;
  managerId: string | null;
  manager: { id: string; name: string } | null;
  targetRoleId: string | null;
  targetRole: { id: string; name: string; isActive: boolean } | null;
  growthHint?: { generatedAt: string } | null;
  roleAchievements: { roleId: string; achievedAt: string }[];
  role: "ADMIN" | "MANAGER" | "MEMBER" | null;
  platformUserId?: string | null;
  pendingAssessments?: {
    skillId: string;
    requestedLevel: number;
    skill: { name: string; category: { name: string } };
  }[];
  memberSkills: {
    id: string;
    skillId: string;
    level: number;
    skill: {
      id: string;
      name: string;
      category: {
        name: string;
      };
    };
  }[];
};

export type MemberListItem = Omit<
  MemberRow,
  "email" | "profile" | "managerId" | "manager" | "pendingAssessments"
> & {
  pendingAssessmentCount: number;
};

export type MemberListData = {
  items: MemberListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TargetRoleOption = {
  id: string;
  name: string;
};

export type OrganizationNodeOption = {
  id: string;
  name: string;
};

export type SkillOption = {
  id: string;
  name: string;
  category: {
    name: string;
  };
};

export type RoleOption = {
  id: string;
  name: string;
  roleRequirements: {
    skillId: string;
    requiredLevel: number;
    isRequired: boolean;
    anyOfGroup?: number | null;
    skill: {
      name: string;
    };
  }[];
};
