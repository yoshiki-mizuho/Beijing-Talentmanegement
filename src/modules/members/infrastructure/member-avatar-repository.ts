import { prisma } from "@/server/db/prisma";

export function getMemberAvatar(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      managerId: true,
      status: true,
      isProfilePublic: true,
      avatarImage: true,
      avatarMimeType: true
    }
  });
}

export function getMemberAvatarUpdatedAt(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: { avatarUpdatedAt: true }
  });
}

export function updateMemberAvatar(
  memberId: string,
  avatarImage: Uint8Array<ArrayBuffer>,
  avatarMimeType: string
) {
  return prisma.member.update({
    where: { id: memberId },
    data: { avatarImage, avatarMimeType, avatarUpdatedAt: new Date() }
  });
}

export function deleteMemberAvatar(memberId: string) {
  return prisma.member.update({
    where: { id: memberId },
    data: { avatarImage: null, avatarMimeType: null, avatarUpdatedAt: null }
  });
}
