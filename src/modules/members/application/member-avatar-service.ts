import type { AuthRole } from "@prisma/client";

import { canViewMemberAvatar, validateMemberAvatar } from "@/modules/members/domain/member-avatar";
import * as repository from "@/modules/members/infrastructure/member-avatar-repository";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";

export async function findViewableMemberAvatar(input: {
  viewerMemberId: string;
  viewerRole: AuthRole;
  memberId: string;
}) {
  const member = await repository.getMemberAvatar(input.memberId);
  if (!member || !member.avatarImage || !member.avatarMimeType) return null;
  const scope =
    input.viewerRole === "MANAGER"
      ? await getMemberScope(input.viewerRole, input.viewerMemberId)
      : null;
  const allowed = canViewMemberAvatar({
    viewer: { role: input.viewerRole, memberId: input.viewerMemberId },
    member,
    managerScopeIncludesMember: scope ? memberIsInScope(scope, member.id) : false
  });
  return allowed ? { bytes: member.avatarImage, mimeType: member.avatarMimeType } : null;
}

export async function updateMyAvatar(memberId: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateMemberAvatar({ mimeType: file.type, bytes });
  await repository.updateMemberAvatar(memberId, bytes, file.type);
}

export function deleteMyAvatar(memberId: string) {
  return repository.deleteMemberAvatar(memberId);
}

export async function getMyAvatarUpdatedAt(memberId: string) {
  return (await repository.getMemberAvatarUpdatedAt(memberId))?.avatarUpdatedAt ?? null;
}
