import { authorizeApi } from "@/server/auth/authorization";
import { findViewableMemberAvatar } from "@/modules/members/application/member-avatar-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const authorization = await authorizeApi();
  if ("response" in authorization) return authorization.response;
  const { memberId } = await params;
  const avatar = await findViewableMemberAvatar({
    viewerMemberId: authorization.session.user.memberId,
    viewerRole: authorization.session.user.role,
    memberId
  });
  if (!avatar) return new Response(null, { status: 404 });

  return new Response(avatar.bytes, {
    headers: {
      "Content-Type": avatar.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable"
    }
  });
}
