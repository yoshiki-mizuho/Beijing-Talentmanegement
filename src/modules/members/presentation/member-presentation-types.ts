export type MemberRow = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  profile: string | null;
  status: string;
  jobTitle: string | null;
  departmentId: string;
  department: {
    id: string;
    name: string;
  };
  managerId: string | null;
  manager: { id: string; name: string } | null;
  targetRoleId: string | null;
  targetRole: { id: string; name: string; isActive: boolean } | null;
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

export type ManagerOption = {
  id: string;
  employeeNo: string;
  name: string;
};

export type TargetRoleOption = {
  id: string;
  name: string;
};

export type DepartmentOption = {
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
    skill: {
      name: string;
    };
  }[];
};
