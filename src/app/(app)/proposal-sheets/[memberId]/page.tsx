import { getProposalSheet } from "@/modules/proposal-sheet/application/proposal-sheet-service";
import { ProposalSheetEditor } from "@/modules/proposal-sheet/presentation/proposal-sheet-editor";
import { getAvailableTemplates } from "@/modules/skill-sheet-template/application/skill-sheet-template-service";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ProposalSheetPage({ params }: { params: Promise<{ memberId: string }> }) {
  const session = await requirePageRoles(managerOrAdmin);
  const { memberId } = await params;
  const actor = { memberId: session.user.memberId, role: session.user.role };
  const [data, templates] = await Promise.all([
    getProposalSheet(
      actor,
      memberId
    ),
    getAvailableTemplates(actor)
  ]);
  return <ProposalSheetEditor data={data} templates={templates} />;
}
