export function getActiveReportError(
  reportCount: number,
  action: "変更できません" | "無効にできません"
) {
  if (reportCount > 0) {
    if (action === "無効にできません") {
      return "部下がいるメンバーは無効にできません。先に部下の上司を付け替えてください。";
    }
    return `部下が ${reportCount}人いるため変更できません。先に上司を付け替えてください`;
  }
  return null;
}
