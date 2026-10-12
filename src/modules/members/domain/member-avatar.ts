import { UserFacingError } from "@/shared/lib/user-facing-error";

export const memberAvatarMaxBytes = 200 * 1024;
export const memberAvatarErrorMessage = "画像は 200KB 以下の PNG・JPEG・WebP にしてください。";

const allowedMimeTypes = new Set(["image/webp", "image/jpeg", "image/png"]);

export function validateMemberAvatar(input: { mimeType: string; bytes: Uint8Array }) {
  if (
    !allowedMimeTypes.has(input.mimeType) ||
    input.bytes.byteLength === 0 ||
    input.bytes.byteLength > memberAvatarMaxBytes ||
    !matchesMagicNumber(input.mimeType, input.bytes)
  ) {
    throw new UserFacingError(memberAvatarErrorMessage);
  }
}

function matchesMagicNumber(mimeType: string, bytes: Uint8Array) {
  if (mimeType === "image/png") {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mimeType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  return (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  );
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function canViewMemberAvatar(input: {
  viewer: { role: string; memberId: string };
  member: { id: string; managerId: string | null; status: string; isProfilePublic: boolean };
  managerScopeIncludesMember: boolean;
}) {
  const { viewer, member } = input;
  if (viewer.role === "ADMIN") return true;
  if (member.status === "ACTIVE") {
    if (
      member.isProfilePublic ||
      viewer.memberId === member.id ||
      member.managerId === viewer.memberId
    ) {
      return true;
    }
  }
  return viewer.role === "MANAGER" && input.managerScopeIncludesMember;
}
