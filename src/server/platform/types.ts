export type PlatformUserStatus = "ACTIVE" | "INACTIVE";

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  status: PlatformUserStatus;
  organizationNodeId: string | null;
  nodeName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  isNodeLeader: boolean;
};

export type OrganizationMember = PlatformUser;

export type OrganizationNode = {
  id: string;
  name: string;
  parentId: string | null;
  levelNumber: number;
  levelName: string;
  memberIds: string[];
  leaderUserIds: string[];
};

export type Organization = {
  nodes: OrganizationNode[];
  members: Map<string, OrganizationMember>;
};

export type LeaderScope = {
  nodeIds: string[];
  members: Map<string, OrganizationMember>;
};
