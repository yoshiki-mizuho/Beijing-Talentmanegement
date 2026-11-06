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
  | "rubber-duck"
  | "first-mover"
  | "retry-success"
  | "combo-10"
  | "anniversary"
  | "groundwork"
  | "multi-class"
  | "cheer-squad"
  | "applause"
  | "sought-after"
  | "new-year-deploy"
  | "welcome-back";

export type BadgeRarity = "common" | "rare" | "epic" | "legend";

export type BadgeDefinition = {
  id: BadgeId;
  name: string;
  condition: string;
  rarity: BadgeRarity;
  group: "growth" | "social" | "secret";
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

const badgeDefinitionSource: readonly BadgeDefinition[] = [
  {
    id: "hello-world",
    name: "Hello, World",
    condition: "はじめてスキルを申請した",
    rarity: "common",
    group: "growth",
    art: ["kkkkkkkkkkkk", "krdydedddddk", "kddddddddddk", "kdeddddddddk", "kddedddddddk", "kdeddeeedddk", "kddddddddddk", "kkkkkkkkkkkk", "....kkkk....", "...kggggk...", "..kkkkkkkk..", "............"]
  },
  {
    id: "save-point",
    name: "セーブポイント",
    condition: "スキルを5件登録した",
    rarity: "common",
    group: "growth",
    art: ["kkkkkkkkkkk.", "kbbwwwwkbbk.", "kbbwwwwkbbbk", "kbbwwwwwbbbk", "kbbbbbbbbbbk", "kbbbbbbbbbbk", "kbwwwwwwwwbk", "kbwkkkkkkwbk", "kbwwwwwwwwbk", "kbwkkkkkwwbk", "kbwwwwwwwwbk", "kkkkkkkkkkkk"]
  },
  {
    id: "lv4-unlock",
    name: "Lv4 アンロック",
    condition: "はじめて Lv4 に到達した",
    rarity: "rare",
    group: "growth",
    art: [".kkkkkkkkkk.", "kttttttttttk", "ktlttttttttk", "ktltytyttttk", "ktltytyttttk", "ktttyyyttttk", "ktttttyttttk", ".kttttytttk.", "..kttttttk..", "...kttttk...", "....kttk....", ".....kk....."]
  },
  {
    id: "build-streak",
    name: "連続ビルド成功",
    condition: "3か月連続でレベルアップした",
    rarity: "rare",
    group: "growth",
    art: ["......o.....", ".....oo.....", ".....ooo....", "....ooyo....", "...oooyoo...", "..ooyyyyoo..", "..oyyccyyo..", "..oyccccyo..", "..oyccccyo..", "...oyccyo...", "....oooo....", "............"]
  },
  {
    id: "deployed",
    name: "デプロイ完了",
    condition: "目標ロールを達成した",
    rarity: "epic",
    group: "growth",
    art: [".....kk.....", "....kwwk....", "....kwwk....", "...kwbbwk...", "...kwbbwk...", "...kwwwwk...", "..rkwwwwkr..", ".rrkwwwwkrr.", ".r.kkkkkk.r.", "....oyyo....", ".....oo.....", ".....o......"]
  },
  {
    id: "full-stack",
    name: "フルスタック",
    condition: "スキルを10件登録した",
    rarity: "epic",
    group: "growth",
    art: ["kkkkkkkkkkkk", "khhhhhhhhhhk", "khehhhhhkkhk", "khhhhhhhhhhk", "kkkkkkkkkkkk", "khhhhhhhhhhk", "khehhhhhkkhk", "khhhhhhhhhhk", "kkkkkkkkkkkk", "khhhhhhhhhhk", "khyhhhhhkkhk", "kkkkkkkkkkkk"]
  },
  {
    id: "master",
    name: "マスター",
    condition: "はじめて Lv5 に到達した",
    rarity: "legend",
    group: "growth",
    art: ["............", "............", ".y...yy...y.", ".yy..yy..yy.", ".yyyyyyyyyy.", ".yyryyyyryy.", ".yyyyyyyyyy.", ".oooooooooo.", "............", "............", "............", "............"]
  },
  {
    id: "rubber-duck",
    name: "ラバーダック",
    condition: "応援で「教えてもらえそうな人」として3人に紹介された",
    rarity: "legend",
    group: "social",
    art: ["............", "....yyy.....", "...yyyyy....", "...ykyyyoo..", "...yyyyy....", "....yyyy....", ".yyyyyyyyy..", "yyyyyyyyyyy.", "yyyyyyyyyy..", ".yyyyyyyy...", "bbbbbbbbbbbb", "............"]
  },
  {
    id: "anniversary", name: "1周年", condition: "登録から1年たち、その1年に1回以上レベルアップした", rarity: "common", group: "growth",
    art: [".....y......", ".....o......", ".....k......", "..kkkkkkkk..", "..kwwwwwwk..", "..krrrrrrk..", ".kkkkkkkkkk.", ".kcccccccck.", ".kccrcccrck.", ".kcccccccck.", "kkkkkkkkkkkk", "............"]
  },
  {
    id: "first-mover", name: "一番乗り", condition: "まだだれも持っていないスキルを、最初に身につけた", rarity: "rare", group: "growth",
    art: ["............", ".k..........", ".kbbbbbbb...", ".kbbbwwbbb..", ".kbbwwwbbb..", ".kbbbwwbbb..", ".kbbbwwbb...", ".kbbwwwwbb..", ".k..........", ".k..........", ".k..........", "kkk........."]
  },
  {
    id: "retry-success", name: "リトライ成功", condition: "差し戻されたスキルで、あとから承認された", rarity: "rare", group: "growth",
    art: ["....tttt....", "..tt....tt..", ".t........t.", ".t.......ttt", "t.........t.", "t...........", "t..........t", "t..........t", ".t........t.", ".t........t.", "..tt....tt..", "....tttt...."]
  },
  {
    id: "combo-10", name: "コンボ10", condition: "レベルアップが通算10回になった", rarity: "rare", group: "growth",
    art: ["............", ".yy...yyyy..", "yyy..yy..yy.", ".yy..yy..yy.", ".yy..yy..yy.", ".yy..yy..yy.", ".yy..yy..yy.", ".yy..yy..yy.", ".yy..yy..yy.", "yyyy..yyyy..", "............", "oooooooooooo"]
  },
  {
    id: "groundwork", name: "土台づくり", condition: "前提スキルをすべて Lv3 以上にしてから、その上のスキルを申請した", rarity: "rare", group: "growth",
    art: ["............", "............", ".....kk.....", "....kook....", "....kkkk....", "...kookook..", "...kkkkkkk..", "..kookookook", "..kkkkkkkkkk", "hhhhhhhhhhhh", "hhhhhhhhhhhh", "............"]
  },
  {
    id: "multi-class", name: "マルチクラス", condition: "3つの大分類でレベルアップした", rarity: "epic", group: "growth",
    art: ["kkkk........", "kttk........", "kttk........", "kkkk........", "....kkkk....", "....kbbk....", "....kbbk....", "....kkkk....", "........kkkk", "........kook", "........kook", "........kkkk"]
  },
  {
    id: "applause", name: "拍手", condition: "リアクションを10回送った", rarity: "common", group: "social",
    art: [".....y......", ".y...y...y..", "..y.....y...", "............", "...kkkkkk...", "..kcccccck..", "..kcccccck..", "..kcckkcck..", "..kcccccck..", "...kcccck...", "....kkkk....", "............"]
  },
  {
    id: "cheer-squad", name: "応援団", condition: "3人に応援を送った", rarity: "common", group: "social",
    art: ["............", ".........k..", "........kok.", "......kkook.", "..kkkkoooook", ".kwkoooooook", ".kwkoooooook", "..kkkkoooook", "...k..kkook.", "...k....kok.", "...kk....k..", "............"]
  },
  {
    id: "sought-after", name: "引っ張りだこ", condition: "「教えてほしい」のリアクションを5回もらった", rarity: "rare", group: "social",
    art: ["....rrrr....", "..rrrrrrrr..", ".rrrrrrrrrr.", ".rrwkrrwkrr.", ".rrwkrrwkrr.", ".rrrrrrrrrr.", "..rrrrrrrr..", ".r.r.rr.r.r.", "r..r.rr.r..r", "r.r..rr..r.r", ".r..r..r..r.", "............"]
  },
  {
    id: "welcome-back", name: "おかえり", condition: "半年以上あいたあとに、レベルアップした", rarity: "rare", group: "secret",
    art: [".....kk.....", "....kook....", "...kooook...", "..kooooook..", ".kooooooook.", "kkkkkkkkkkkk", ".kcccccccck.", ".kcbbcckkck.", ".kcbbcckkck.", ".kccccckkck.", ".kkkkkkkkkk.", "............"]
  },
  {
    id: "new-year-deploy", name: "年越しデプロイ", condition: "1月にレベルアップした", rarity: "epic", group: "secret",
    art: ["............", "............", "....yyyy....", "..yyyyyyyy..", ".yyyyyyyyyy.", ".yyyyyyyyyy.", "bbbbbbbbbbbb", "bbwwbbbbwwbb", "bbbbbbbbbbbb", "dddddddddddd", "dddddddddddd", "............"]
  }
];

const badgeGroupOrder = { growth: 0, social: 1, secret: 2 } as const;
const badgeRarityOrder = { common: 0, rare: 1, epic: 2, legend: 3 } as const;

export const badgeDefinitions: readonly BadgeDefinition[] = [...badgeDefinitionSource]
  .sort((left, right) =>
    badgeGroupOrder[left.group] - badgeGroupOrder[right.group] ||
    badgeRarityOrder[left.rarity] - badgeRarityOrder[right.rarity]
  );

// 未獲得のシークレットに出す「？」の絵（色はシルエットのグレー）
export const secretBadgeArt: readonly string[] = [
  "............",
  "...gggggg...",
  "..gg....gg..",
  "..gg....gg..",
  "........gg..",
  ".......gg...",
  ".....gg.....",
  ".....gg.....",
  "............",
  ".....gg.....",
  ".....gg.....",
  "............"
];
