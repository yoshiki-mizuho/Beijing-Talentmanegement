import {
  listDepartments,
  listMemberPage
} from "@/modules/members/application/member-service";
import { MemberSearchTable } from "@/modules/members/presentation/member-search-table";
import { listSkills } from "@/modules/skills/application/skill-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { Card, CardContent } from "@/shared/ui/card";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { parseTargetRoleFilter } from "@/modules/members/presentation/target-role-filter";
import { parseMemberListSearchParams } from "@/modules/members/domain/member-search";
import { buildMemberSearchParams } from "@/modules/members/presentation/member-search-filters";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialUrlState = parseMemberListSearchParams(await searchParams);
  const session = await requirePageRoles(managerOrAdmin);
  // 1on1 メモは、範囲の部下を開いた MANAGER だけが使う（範囲はサーバでも確かめる）。
  const oneOnOneViewerMemberId =
    session.user.role === "MANAGER" ? session.user.memberId : null;
  const scope = await getMemberScope(session.user.role, session.user.memberId);
  const initialMemberParams = Object.fromEntries(
    buildMemberSearchParams(initialUrlState.filters)
  );
  const [memberData, departments, skills, roles] = await Promise.all([
    listMemberPage(
      {
        ...initialMemberParams,
        targetRole: initialUrlState.targetRole || undefined,
        page: initialUrlState.page
      },
      scope.memberIds
    ),
    listDepartments(),
    listSkills(),
    listRoles()
  ]);
  const activeSkills = skills.filter((skill) => skill.isActive);
  const skillOptions = activeSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: {
      name: skill.category.name
    }
  }));
  const roleOptions = roles.map((role) => ({
    id: role.id,
    name: role.name,
    roleRequirements: role.roleRequirements.map((requirement) => ({
      skillId: requirement.skillId,
      requiredLevel: requirement.requiredLevel,
      isRequired: requirement.isRequired,
      anyOfGroup: requirement.anyOfGroup,
      skill: {
        name: requirement.skill.name
      }
    }))
  }));
  const targetRoleOptions = roles
    .filter((role) => role.isActive)
    .map((role) => ({ id: role.id, name: role.name }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <MemberSearchTable
            initialData={memberData}
            departments={departments}
            skills={skillOptions}
            roles={roleOptions}
            targetRoles={targetRoleOptions}
            oneOnOneViewerMemberId={oneOnOneViewerMemberId}
            scopeName={scope.name}
            initialFilters={initialUrlState.filters}
            initialPage={initialUrlState.page}
            initialMemberId={initialUrlState.memberId}
            initialTargetRoleFilter={parseTargetRoleFilter(initialUrlState.targetRole)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
