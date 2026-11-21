import { downloadTemplate } from "@/modules/skill-sheet-template/application/skill-sheet-template-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

export async function GET(_request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const auth = await authorizeApi(adminOnly);
  if (auth.response) return auth.response;
  const { templateId } = await params;
  const result = await downloadTemplate(
    { memberId: auth.session.user.memberId, role: auth.session.user.role },
    templateId
  );
  if (!result) return Response.json({ error: "Not Found" }, { status: 404 });
  return new Response(result.content, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDisposition(result.name)
    }
  });
}

function contentDisposition(name: string) {
  return `attachment; filename="template.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
