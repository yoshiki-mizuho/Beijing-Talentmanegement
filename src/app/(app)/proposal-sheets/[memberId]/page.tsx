import { getProposalSheet } from "@/modules/proposal-sheet/application/proposal-sheet-service";
import { ProposalSheetEditor } from "@/modules/proposal-sheet/presentation/proposal-sheet-editor";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ProposalSheetPage({ params }: { params: Promise<{ memberId: string }> }) {
  const session = await requirePageRoles(managerOrAdmin);
  const { memberId } = await params;
  const data = await getProposalSheet(
    { memberId: session.user.memberId, role: session.user.role },
    memberId
  );
  return <ProposalSheetEditor data={data} />;
}
