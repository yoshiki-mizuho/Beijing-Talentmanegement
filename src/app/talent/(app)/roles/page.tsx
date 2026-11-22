import { AuthRole } from "@prisma/client";

import { getMemberScope } from "@/modules/members/application/member-scope";
import { listMembers } from "@/modules/members/application/member-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { listRoleAchievements } from "@/modules/roles/application/role-achievement-service";
import { canManageRoles } from "@/modules/roles/presentation/role-permissions";
import { RolePage } from "@/modules/roles/presentation/role-page";
import { buildRolePageViewModel } from "@/modules/roles/presentation/role-page-view-model";
import { listSkills } from "@/modules/skills/application/skill-service";
import { requirePageRoles } from "@/server/auth/authorization";
import { fallbackMemberProfile, resolveMemberProfiles } from "@/modules/members/application/member-directory";

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
  const [roles, skills, activeMembers, achievements, params] = await Promise.all([
    listRoles(),
    canManage ? listSkills() : Promise.resolve([]),
    listMembers({ status: "ACTIVE" }),
    listRoleAchievements(),
    searchParams
  ]);
  const memberProfiles = await resolveMemberProfiles(activeMembers.map((member) => member.id));
  const roleItems = buildRolePageViewModel({
    viewerRole: session.user.role,
    viewerMemberId: session.user.memberId,
    scopedMemberIds: scope?.memberIds ?? [session.user.memberId],
    roles,
    activeMembers: activeMembers.map((member) => {
      const profile = memberProfiles.get(member.id) ?? fallbackMemberProfile(member.id);
      return { ...member, ...profile };
    }),
    achievements
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
