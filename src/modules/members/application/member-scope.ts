import type { AuthRole, MemberStatus } from "@prisma/client";

import * as memberScopeRepository from "@/modules/members/infrastructure/member-scope-repository";
import { collectDescendantIds } from "@/modules/members/domain/department-hierarchy";

export type MemberScope = {
  // 在籍状態を問わず、閲覧・管理できるメンバー（休職中・退職も一覧の絞り込みで見るため含める）
  memberIds: string[];
  activeMemberCount: number;
  name: string;
  departmentId: string | null;
};

type ScopeMember = {
  id: string;
  departmentId: string;
  managerId: string | null;
  status: MemberStatus;
};

export function resolveMemberScope(input: {
  role: AuthRole;
  requestedDepartmentId?: string;
  viewer: { id: string; departmentId: string; departmentName: string };
  departments: { id: string; name: string; parentDepartmentId: string | null }[];
  members: ScopeMember[];
}): MemberScope {
  if (input.role === "ADMIN") {
    const department = input.departments.find(
      (item) => item.id === input.requestedDepartmentId
    );
    const departmentIds = department
      ? new Set(collectDescendantIds(input.departments, department.id))
      : null;
    return buildScope(
      input.members.filter((member) => !departmentIds || departmentIds.has(member.departmentId)),
      department?.name ?? "全社",
      department?.id ?? null
    );
  }

  const departmentIds = new Set(
    collectDescendantIds(input.departments, input.viewer.departmentId)
  );
  return buildScope(
    input.members.filter(
      (member) =>
        departmentIds.has(member.departmentId) ||
        member.managerId === input.viewer.id
    ),
    input.viewer.departmentName,
    input.viewer.departmentId
  );
}

function buildScope(
  members: ScopeMember[],
  name: string,
  departmentId: string | null
): MemberScope {
  return {
    memberIds: members.map((member) => member.id),
    activeMemberCount: members.filter((member) => member.status === "ACTIVE").length,
    name,
    departmentId
  };
}

export async function getMemberScope(
  role: AuthRole,
  memberId: string,
  requestedDepartmentId?: string
) {
  return resolveMemberScope({
    role,
    requestedDepartmentId,
    ...(await memberScopeRepository.getMemberScopeSource(memberId))
  });
}

export function memberIsInScope(scope: MemberScope, memberId: string) {
  return scope.memberIds.includes(memberId);
}
