export function getActiveReportError(
  reportCount: number,
  action: "変更できません" | "無効にできません"
) {
  if (reportCount > 0) {
    if (action === "無効にできません") {
      return "担当のメンバーがいるため無効にできません。先にメンバーの上司を付け替えてください。";
    }
    return `担当のメンバーが ${reportCount}人いるため変更できません。先に上司を付け替えてください`;
  }
  return null;
}
