export const chartColors = {
  // --hub-color-primary-600 と同じ値。製品の主系列として使う。
  primary: "oklch(0.47 0.145 20.7)",
  // 対応する基盤変数はない。えんじや危険の赤と見分けやすい青。
  blue: "#397f9b",
  // --hub-color-warning-text と同じ値。危険ではなく注意を示す琥珀。
  amber: "oklch(55.5% 0.163 48.998)",
  // --hub-color-success-text と同じ値。危険の赤と混同しない緑。
  green: "oklch(50.8% 0.118 165.612)",
  // --hub-color-neutral-text と同じ値。補助系列に使う中立色。
  neutral: "oklch(55.4% 0.046 257.417)",
  // --hub-color-border と同じ値。グラフの罫線に使う。
  border: "oklch(92.8% 0.006 264.531)",
  // --hub-color-surface-subtle と同じ値。グラフの背景面に使う。
  surfaceSubtle: "oklch(98.5% 0.002 247.839)",
  // --hub-color-text-muted と同じ値。軸や補助文字に使う。
  textMuted: "oklch(55.1% 0.027 264.364)"
} as const;

export const chartSeries = [
  chartColors.primary,
  chartColors.blue,
  chartColors.amber,
  chartColors.green,
  chartColors.neutral
] as const;
