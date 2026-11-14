import { getTemplateList } from "@/modules/skill-sheet-template/application/skill-sheet-template-service";
import { SkillSheetTemplatePage } from "@/modules/skill-sheet-template/presentation/skill-sheet-template-page";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requirePageRoles(adminOnly);
  const actor = { memberId: session.user.memberId, role: session.user.role };
  return <SkillSheetTemplatePage templates={await getTemplateList(actor)} />;
}
