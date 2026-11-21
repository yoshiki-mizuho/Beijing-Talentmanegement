export type FakeNode = {
  id: string;
  name: string;
  levelNumber: number;
  levelName: string;
  parentId: string | null;
  leaderUserIds: string[];
};

export type FakeUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INACTIVE";
  organizationNodeId: string | null;
  avatarColor: string | null;
  avatarUrl: string | null;
};

export type FakeTenant = {
  id: string;
  slug: string;
  nodes: FakeNode[];
  users: FakeUser[];
};

const LOCAL_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const NO_HUB_TENANT_ID = "11111111-1111-4111-8111-222222222222";
const localNode = (suffix: string) =>
  `33333333-3333-4333-8333-3333333333${suffix}`;
const localUser = (suffix: string) =>
  `22222222-2222-4222-8222-0000000000${suffix}`;

export function createDefaultTenants(): FakeTenant[] {
  return [
    {
      id: LOCAL_TENANT_ID,
      slug: "local-dev",
      nodes: [
        { id: localNode("01"), name: "事業開発部", levelNumber: 1, levelName: "部", parentId: null, leaderUserIds: [localUser("02")] },
        { id: localNode("02"), name: "プロダクト課", levelNumber: 2, levelName: "課", parentId: localNode("01"), leaderUserIds: [localUser("03")] },
        { id: localNode("03"), name: "営業課", levelNumber: 2, levelName: "課", parentId: localNode("01"), leaderUserIds: [localUser("08")] },
        { id: localNode("04"), name: "画面チーム", levelNumber: 3, levelName: "チーム", parentId: localNode("02"), leaderUserIds: [localUser("04")] },
        { id: localNode("05"), name: "基盤チーム", levelNumber: 3, levelName: "チーム", parentId: localNode("02"), leaderUserIds: [localUser("06")] }
      ],
      users: [
        { id: "22222222-2222-4222-8222-222222222222", name: "佐藤 花子", email: "hanako.sato@local-dev.test", role: "ADMIN", status: "ACTIVE", organizationNodeId: localNode("01"), avatarColor: "violet", avatarUrl: null },
        { id: localUser("02"), name: "鈴木 一郎", email: "ichiro.suzuki@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("01"), avatarColor: "blue", avatarUrl: null },
        { id: localUser("03"), name: "高橋 美咲", email: "misaki.takahashi@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("02"), avatarColor: "emerald", avatarUrl: null },
        { id: localUser("04"), name: "田中 健太", email: "kenta.tanaka@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("04"), avatarColor: "orange", avatarUrl: null },
        { id: localUser("05"), name: "伊藤 さくら", email: "sakura.ito@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("04"), avatarColor: "pink", avatarUrl: null },
        { id: localUser("06"), name: "渡辺 大輔", email: "daisuke.watanabe@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("05"), avatarColor: "sky", avatarUrl: null },
        { id: localUser("07"), name: "山本 陽菜", email: "hina.yamamoto@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("05"), avatarColor: "amber", avatarUrl: null },
        { id: localUser("08"), name: "中村 翔", email: "sho.nakamura@local-dev.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: localNode("03"), avatarColor: "gray", avatarUrl: null },
        { id: localUser("09"), name: "小林 直樹", email: "naoki.kobayashi@local-dev.test", role: "MEMBER", status: "INACTIVE", organizationNodeId: localNode("03"), avatarColor: null, avatarUrl: null }
      ]
    },
    {
      id: NO_HUB_TENANT_ID,
      slug: "no-hub",
      nodes: [{ id: "33333333-3333-4333-8333-444444444401", name: "総務部", levelNumber: 1, levelName: "部", parentId: null, leaderUserIds: ["22222222-2222-4222-8222-aaaaaaaaaa01"] }],
      users: [
        { id: "22222222-2222-4222-8222-aaaaaaaaaa01", name: "加藤 誠", email: "makoto.kato@no-hub.test", role: "ADMIN", status: "ACTIVE", organizationNodeId: "33333333-3333-4333-8333-444444444401", avatarColor: null, avatarUrl: null },
        { id: "22222222-2222-4222-8222-aaaaaaaaaa02", name: "吉田 葵", email: "aoi.yoshida@no-hub.test", role: "MEMBER", status: "ACTIVE", organizationNodeId: "33333333-3333-4333-8333-444444444401", avatarColor: null, avatarUrl: null }
      ]
    }
  ];
}
