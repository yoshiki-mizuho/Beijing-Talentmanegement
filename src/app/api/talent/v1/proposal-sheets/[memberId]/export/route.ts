import { exportProposalSheet } from "@/modules/skill-sheet-template/application/skill-sheet-template-service";
import {
  AuthorizationError,
  authorizeApi,
  managerOrAdmin
} from "@/server/auth/authorization";

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const auth = await authorizeApi(managerOrAdmin);
  if (auth.response) return auth.response;
  const { memberId } = await params;
  const templateId = new URL(request.url).searchParams.get("template") ?? "standard";
  let result: Awaited<ReturnType<typeof exportProposalSheet>>;
  try {
    result = await exportProposalSheet(
      { memberId: auth.session.user.memberId, role: auth.session.user.role },
      memberId,
      templateId
    );
  } catch (error) {
    // 担当範囲外のメンバーは 403、存在しないメンバーは 404 にする（500 にしない）
    if (error instanceof AuthorizationError) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "member_not_found") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }
    throw error;
  }
  if (!result) return Response.json({ error: "Not Found" }, { status: 404 });
  return new Response(result.content, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="skill-sheet.xlsx"; filename*=UTF-8''${encodeURIComponent(result.name)}`
    }
  });
}
