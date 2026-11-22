import { z } from "zod";

// 画面から受け取る項目。下書きの出どころ（AI・簡易版）や作成日時は、画面から受け取らずサーバーで決める
export const proposalSheetEditSchema = z.object({
  memberId: z.string().min(1),
  displayName: z.string().trim().max(20),
  customerRequest: z.string().trim().max(2000),
  projectHistoryIds: z.array(z.string()),
  excludedSkillIds: z.array(z.string()),
  selfPr: z.string().max(800),
  strengths: z.string().max(200),
  projectDescriptions: z.record(z.string(), z.string().max(500)),
  aiJobId: z.string().optional()
});

export const proposalSheetSettingsSchema = proposalSheetEditSchema.pick({
  memberId: true,
  displayName: true,
  customerRequest: true,
  projectHistoryIds: true,
  excludedSkillIds: true
});

export type ProposalSheetEditInput = z.infer<typeof proposalSheetEditSchema>;
export type ProposalSheetSettingsInput = z.infer<typeof proposalSheetSettingsSchema>;

export type ProposalSheetDraftData = ProposalSheetEditInput & {
  source: "AI" | "FALLBACK" | "MANUAL";
  inputHash: string | null;
  model: string | null;
  generatedAt: string | null;
};

// 選んだ経歴・スキルの id のうち、そのメンバーのものだけを残す
export function keepKnownIds(ids: string[], knownIds: Iterable<string>) {
  const known = new Set(knownIds);
  return [...new Set(ids)].filter((id) => known.has(id));
}

// 説明文は、載せる経歴の分だけを残す
export function keepDescriptionsFor(
  descriptions: Record<string, string>,
  projectHistoryIds: string[]
) {
  return Object.fromEntries(
    projectHistoryIds
      .filter((id) => typeof descriptions[id] === "string")
      .map((id) => [id, descriptions[id]])
  );
}
