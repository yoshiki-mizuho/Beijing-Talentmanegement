// 達成バッジのドット絵データ（docs/DESIGN_GUIDELINES.md「達成バッジ」）。
// 合意済みプロトタイプの定義をそのまま移したもの。1文字が1ドットで、"." は透明。

export type BadgeId =
  | "hello-world"
  | "save-point"
  | "lv4-unlock"
  | "build-streak"
  | "deployed"
  | "full-stack"
  | "master"
  | "rubber-duck";

export type BadgeRarity = "common" | "rare" | "epic" | "legend";

export type BadgeDefinition = {
  id: BadgeId;
  name: string;
  condition: string;
  rarity: BadgeRarity;
  art: readonly string[];
};

export const badgePalette: Readonly<Record<string, string>> = {
  k: "#1E2A2A",
  w: "#FFFFFF",
  t: "#0F766E",
  l: "#5EEAD4",
  y: "#FBBF24",
  o: "#F59E0B",
  r: "#DC2626",
  e: "#22C55E",
  d: "#0B2530",
  b: "#3B82F6",
  h: "#475569",
  g: "#94A3B8",
  c: "#FEF3C7"
};

export const badgeRarities: Readonly<
  Record<BadgeRarity, { label: string; frame: string; background: string }>
> = {
  common: { label: "コモン", frame: "#0F766E", background: "#E6F4F1" },
  rare: { label: "レア", frame: "#2563EB", background: "#E8F0FE" },
  epic: { label: "エピック", frame: "#7C3AED", background: "#F1EAFE" },
  legend: { label: "レジェンド", frame: "#D97706", background: "#FEF3C7" }
};

export const badgeDefinitions: readonly BadgeDefinition[] = [
  {
    id: "hello-world",
    name: "Hello, World",
    condition: "はじめてスキルを申請した",
    rarity: "common",
    art: ["kkkkkkkkkkkk", "krdydedddddk", "kddddddddddk", "kdeddddddddk", "kddedddddddk", "kdeddeeedddk", "kddddddddddk", "kkkkkkkkkkkk", "....kkkk....", "...kggggk...", "..kkkkkkkk..", "............"]
  },
  {
    id: "save-point",
    name: "セーブポイント",
    condition: "スキルを5件登録した",
    rarity: "common",
    art: ["kkkkkkkkkkk.", "kbbwwwwkbbk.", "kbbwwwwkbbbk", "kbbwwwwwbbbk", "kbbbbbbbbbbk", "kbbbbbbbbbbk", "kbwwwwwwwwbk", "kbwkkkkkkwbk", "kbwwwwwwwwbk", "kbwkkkkkwwbk", "kbwwwwwwwwbk", "kkkkkkkkkkkk"]
  },
  {
    id: "lv4-unlock",
    name: "Lv4 アンロック",
    condition: "はじめて Lv4 に到達した",
    rarity: "rare",
    art: [".kkkkkkkkkk.", "kttttttttttk", "ktlttttttttk", "ktltytyttttk", "ktltytyttttk", "ktttyyyttttk", "ktttttyttttk", ".kttttytttk.", "..kttttttk..", "...kttttk...", "....kttk....", ".....kk....."]
  },
  {
    id: "build-streak",
    name: "連続ビルド成功",
    condition: "3か月連続でレベルアップした",
    rarity: "rare",
    art: ["......o.....", ".....oo.....", ".....ooo....", "....ooyo....", "...oooyoo...", "..ooyyyyoo..", "..oyyccyyo..", "..oyccccyo..", "..oyccccyo..", "...oyccyo...", "....oooo....", "............"]
  },
  {
    id: "deployed",
    name: "デプロイ完了",
    condition: "目標ロールを達成した",
    rarity: "epic",
    art: [".....kk.....", "....kwwk....", "....kwwk....", "...kwbbwk...", "...kwbbwk...", "...kwwwwk...", "..rkwwwwkr..", ".rrkwwwwkrr.", ".r.kkkkkk.r.", "....oyyo....", ".....oo.....", ".....o......"]
  },
  {
    id: "full-stack",
    name: "フルスタック",
    condition: "スキルを10件登録した",
    rarity: "epic",
    art: ["kkkkkkkkkkkk", "khhhhhhhhhhk", "khehhhhhkkhk", "khhhhhhhhhhk", "kkkkkkkkkkkk", "khhhhhhhhhhk", "khehhhhhkkhk", "khhhhhhhhhhk", "kkkkkkkkkkkk", "khhhhhhhhhhk", "khyhhhhhkkhk", "kkkkkkkkkkkk"]
  },
  {
    id: "master",
    name: "マスター",
    condition: "はじめて Lv5 に到達した",
    rarity: "legend",
    art: ["............", "............", ".y...yy...y.", ".yy..yy..yy.", ".yyyyyyyyyy.", ".yyryyyyryy.", ".yyyyyyyyyy.", ".oooooooooo.", "............", "............", "............", "............"]
  },
  {
    id: "rubber-duck",
    name: "ラバーダック",
    condition: "応援で「教えてもらえそうな人」として3人に紹介された",
    rarity: "legend",
    art: ["............", "....yyy.....", "...yyyyy....", "...ykyyyoo..", "...yyyyy....", "....yyyy....", ".yyyyyyyyy..", "yyyyyyyyyyy.", "yyyyyyyyyy..", ".yyyyyyyy...", "bbbbbbbbbbbb", "............"]
  }
];
