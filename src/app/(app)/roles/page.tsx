import { AuthRole } from "@prisma/client";

import { getMemberScope } from "@/modules/members/application/member-scope";
import { listMembers } from "@/modules/members/application/member-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { canManageRoles } from "@/modules/roles/presentation/role-permissions";
import { RolePage } from "@/modules/roles/presentation/role-page";
import { buildRolePageViewModel } from "@/modules/roles/presentation/role-page-view-model";
import { listSkills } from "@/modules/skills/application/skill-service";
import { requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

const allRoles = [AuthRole.ADMIN, AuthRole.MANAGER, AuthRole.MEMBER] as const;

export default async function RolesPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await requirePageRoles(allRoles);
  const canManage = canManageRoles(session.user.role);
  const scope = session.user.role === "MEMBER"
    ? null
    : await getMemberScope(session.user.role, session.user.memberId);
  const [roles, skills, activeMembers, params] = await Promise.all([
    listRoles(),
    canManage ? listSkills() : Promise.resolve([]),
    listMembers({ status: "ACTIVE" }),
    searchParams
  ]);
  const roleItems = buildRolePageViewModel({
    viewerRole: session.user.role,
    viewerMemberId: session.user.memberId,
    scopedMemberIds: scope?.memberIds ?? [session.user.memberId],
    roles,
    activeMembers
  });

  return (
    <RolePage
      roles={roleItems}
      selectedRoleId={params.role}
      viewerMemberId={session.user.memberId}
      scopeLabel={session.user.role === "ADMIN" ? "全社の状況" : "担当メンバーの状況"}
      skills={skills
        .filter((skill) => skill.isActive)
        .map((skill) => ({
          id: skill.id,
          name: skill.name,
          categoryName: skill.category.name
        }))}
      canManage={canManage}
      showMemberStatus={session.user.role !== "MEMBER"}
    />
  );
}
