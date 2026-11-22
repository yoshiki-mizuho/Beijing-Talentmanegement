export const demoSkillCategories = [
  { name: "プログラミング言語", displayOrder: 10 },
  { name: "フレームワーク", displayOrder: 20 },
  { name: "クラウド・インフラ", displayOrder: 30 },
  { name: "データベース", displayOrder: 40 },
  { name: "マネジメント", displayOrder: 50 }
] as const;

export const demoSkillCategoryGroups = [
  {
    name: "技術",
    displayOrder: 10,
    categoryNames: [
      "プログラミング言語",
      "フレームワーク",
      "クラウド・インフラ",
      "データベース"
    ]
  },
  {
    name: "マネジメント・ビジネス",
    displayOrder: 20,
    categoryNames: ["マネジメント"]
  }
] as const;

export const demoSkills = [
  {
    code: "DEMO-SKILL-001",
    name: "JavaScript",
    categoryName: "プログラミング言語",
    description: "Webアプリケーション開発で使用するプログラミング言語"
  },
  {
    code: "DEMO-SKILL-002",
    name: "TypeScript",
    categoryName: "プログラミング言語",
    description: "型安全なWebアプリケーション開発"
  },
  {
    code: "DEMO-SKILL-003",
    name: "Python",
    categoryName: "プログラミング言語",
    description: "自動化やデータ処理向けのプログラミング言語"
  },
  {
    code: "DEMO-SKILL-004",
    name: "Java",
    categoryName: "プログラミング言語",
    description: "業務システム開発向けのプログラミング言語"
  },
  {
    code: "DEMO-SKILL-005",
    name: "React",
    categoryName: "フレームワーク",
    description: "コンポーネント指向のUI開発"
  },
  {
    code: "DEMO-SKILL-006",
    name: "Next.js",
    categoryName: "フレームワーク",
    description: "ReactベースのWebアプリケーション開発"
  },
  {
    code: "DEMO-SKILL-007",
    name: "Node.js",
    categoryName: "フレームワーク",
    description: "JavaScriptによるサーバーサイド開発"
  },
  {
    code: "DEMO-SKILL-008",
    name: "Spring Boot",
    categoryName: "フレームワーク",
    description: "Javaによる業務アプリケーション開発"
  },
  {
    code: "DEMO-SKILL-009",
    name: "AWS",
    categoryName: "クラウド・インフラ",
    description: "クラウド基盤の設計と運用"
  },
  {
    code: "DEMO-SKILL-010",
    name: "Azure",
    categoryName: "クラウド・インフラ",
    description: "クラウドサービスの設計と運用"
  },
  {
    code: "DEMO-SKILL-011",
    name: "Docker",
    categoryName: "クラウド・インフラ",
    description: "コンテナ環境の構築と運用"
  },
  {
    code: "DEMO-SKILL-012",
    name: "Kubernetes",
    categoryName: "クラウド・インフラ",
    description: "コンテナオーケストレーション基盤の設計と運用"
  },
  {
    code: "DEMO-SKILL-013",
    name: "PostgreSQL",
    categoryName: "データベース",
    description: "リレーショナルデータベースの設計と運用"
  },
  {
    code: "DEMO-SKILL-014",
    name: "MySQL",
    categoryName: "データベース",
    description: "リレーショナルデータベースの設計と運用"
  },
  {
    code: "DEMO-SKILL-015",
    name: "Redis",
    categoryName: "データベース",
    description: "インメモリデータストアの設計と活用"
  },
  {
    code: "DEMO-SKILL-016",
    name: "プロジェクト管理",
    categoryName: "マネジメント",
    description: "計画、進捗、課題、リスクの管理"
  },
  {
    code: "DEMO-SKILL-017",
    name: "チームリーダーシップ",
    categoryName: "マネジメント",
    description: "チーム運営とメンバー育成"
  },
  {
    code: "DEMO-SKILL-018",
    name: "アジャイル開発",
    categoryName: "マネジメント",
    description: "反復的な開発プロセスの運営と改善"
  }
] as const;

export const demoSkillPrerequisites = [
  { skillName: "TypeScript", prerequisiteSkillName: "JavaScript" },
  { skillName: "React", prerequisiteSkillName: "JavaScript" },
  { skillName: "Next.js", prerequisiteSkillName: "React" }
] as const;

export const demoRoles = [
  {
    name: "フロントエンドエンジニア",
    description: "利用者向けWeb画面の設計と実装を担うロール",
    requirements: [
      { skillCode: "DEMO-SKILL-002", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-005", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-006", requiredLevel: 3, isRequired: true },
      { skillCode: "DEMO-SKILL-007", requiredLevel: 2, isRequired: false },
      // 「いずれか1つ」の組の例
      { skillCode: "DEMO-SKILL-001", requiredLevel: 3, isRequired: true, anyOfGroup: 1 },
      { skillCode: "DEMO-SKILL-003", requiredLevel: 3, isRequired: true, anyOfGroup: 1 }
    ]
  },
  {
    name: "クラウドエンジニア",
    description: "クラウド基盤の設計、構築、運用を担うロール",
    requirements: [
      { skillCode: "DEMO-SKILL-009", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-011", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-012", requiredLevel: 3, isRequired: true },
      { skillCode: "DEMO-SKILL-013", requiredLevel: 2, isRequired: false }
    ]
  },
  {
    name: "プロジェクトリーダー",
    description: "プロジェクト計画とチーム運営を担うロール",
    requirements: [
      { skillCode: "DEMO-SKILL-016", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-017", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-018", requiredLevel: 3, isRequired: true },
      { skillCode: "DEMO-SKILL-002", requiredLevel: 2, isRequired: false }
    ]
  }
] as const;

export const demoMembers = [
  { platformUserId: "22222222-2222-4222-8222-222222222222", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000002", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000003", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000004", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000006", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000008", status: "ACTIVE" },
  { platformUserId: "22222222-2222-4222-8222-000000000009", status: "INACTIVE" }
] as const;

export const demoMemberProfiles = [
  {
    platformUserId: "22222222-2222-4222-8222-000000000005",
    profileMessage: "小さな改善を積み重ねています。",
    consultTopics: ["TypeScript", "コードレビュー", "テスト設計"]
  },
  {
    platformUserId: "22222222-2222-4222-8222-000000000005",
    profileMessage: "使いやすい画面づくりが好きです。",
    consultTopics: ["React", "Next.js", "アクセシビリティ", "画面設計"]
  },
  {
    platformUserId: "22222222-2222-4222-8222-000000000003",
    profileMessage: "堅実なAPI設計を一緒に考えます。",
    consultTopics: ["API設計", "データベース", "性能改善"]
  },
  {
    platformUserId: "22222222-2222-4222-8222-000000000007",
    profileMessage: "安全に運べる基盤を育てています。",
    consultTopics: ["AWS", "Docker", "監視", "CI/CD"]
  }
] as const;

export const demoMemberSkills = [
  { platformUserId: "22222222-2222-4222-8222-222222222222", skillCode: "DEMO-SKILL-016", level: 4, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-222222222222", skillCode: "DEMO-SKILL-017", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-222222222222", skillCode: "DEMO-SKILL-018", level: 3, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000004", skillCode: "DEMO-SKILL-002", level: 4, yearsOfExperience: 7 },
  { platformUserId: "22222222-2222-4222-8222-000000000004", skillCode: "DEMO-SKILL-005", level: 4, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-000000000004", skillCode: "DEMO-SKILL-006", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000004", skillCode: "DEMO-SKILL-016", level: 4, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-000000000004", skillCode: "DEMO-SKILL-017", level: 5, yearsOfExperience: 7 },
  { platformUserId: "22222222-2222-4222-8222-000000000004", skillCode: "DEMO-SKILL-018", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-001", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-002", level: 4, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", level: 5, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-006", level: 4, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-013", level: 2, yearsOfExperience: 1.5 },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-002", level: 4, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-005", level: 4, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-007", level: 3, yearsOfExperience: 2 },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-004", level: 4, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-008", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-013", level: 3, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-014", level: 3, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-003", level: 3, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-009", level: 5, yearsOfExperience: 7 },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-011", level: 5, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-012", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-013", level: 4, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-000000000006", skillCode: "DEMO-SKILL-009", level: 3, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000006", skillCode: "DEMO-SKILL-010", level: 4, yearsOfExperience: 5 },
  { platformUserId: "22222222-2222-4222-8222-000000000006", skillCode: "DEMO-SKILL-011", level: 4, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000006", skillCode: "DEMO-SKILL-012", level: 3, yearsOfExperience: 2 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-017", level: 3, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-018", level: 3, yearsOfExperience: 2 },
  { platformUserId: "22222222-2222-4222-8222-000000000002", skillCode: "DEMO-SKILL-002", level: 2, yearsOfExperience: 2 },
  { platformUserId: "22222222-2222-4222-8222-000000000002", skillCode: "DEMO-SKILL-009", level: 2, yearsOfExperience: 2 },
  { platformUserId: "22222222-2222-4222-8222-000000000002", skillCode: "DEMO-SKILL-016", level: 5, yearsOfExperience: 8 },
  { platformUserId: "22222222-2222-4222-8222-000000000002", skillCode: "DEMO-SKILL-017", level: 5, yearsOfExperience: 7 },
  { platformUserId: "22222222-2222-4222-8222-000000000002", skillCode: "DEMO-SKILL-018", level: 4, yearsOfExperience: 6 },
  { platformUserId: "22222222-2222-4222-8222-000000000009", skillCode: "DEMO-SKILL-003", level: 2, yearsOfExperience: 1 },
  { platformUserId: "22222222-2222-4222-8222-000000000009", skillCode: "DEMO-SKILL-004", level: 3, yearsOfExperience: 4 },
  { platformUserId: "22222222-2222-4222-8222-000000000009", skillCode: "DEMO-SKILL-008", level: 3, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000009", skillCode: "DEMO-SKILL-014", level: 2, yearsOfExperience: 2 },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-015", level: 3, yearsOfExperience: 3 }
] as const;

export const demoSkillAssessments = [
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", requestedLevel: 4, yearsOfExperience: 3 },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-011", requestedLevel: 3, yearsOfExperience: 2 }
] as const;

export const demoTargetRoleAssignments = [
  { platformUserId: "22222222-2222-4222-8222-000000000005", roleName: "フロントエンドエンジニア" },
  { platformUserId: "22222222-2222-4222-8222-000000000003", roleName: "フロントエンドエンジニア" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", roleName: "フロントエンドエンジニア" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", roleName: "クラウドエンジニア" },
  { platformUserId: "22222222-2222-4222-8222-000000000006", roleName: "クラウドエンジニア" },
  { platformUserId: "22222222-2222-4222-8222-000000000002", roleName: "プロジェクトリーダー" }
] as const;

export const demoSkillLevelChanges = [
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-001", fromLevel: null, toLevel: 1, changedAt: "2021-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", fromLevel: null, toLevel: 2, changedAt: "2021-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-001", fromLevel: 1, toLevel: 3, changedAt: "2023-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", fromLevel: 2, toLevel: 3, changedAt: "2023-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-001", fromLevel: 3, toLevel: 4, changedAt: "2025-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", fromLevel: 3, toLevel: 4, changedAt: "2025-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-009", fromLevel: null, toLevel: 2, changedAt: "2021-10-03T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-011", fromLevel: null, toLevel: 2, changedAt: "2021-10-03T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-009", fromLevel: 2, toLevel: 3, changedAt: "2023-10-03T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-011", fromLevel: 2, toLevel: 4, changedAt: "2023-10-03T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-009", fromLevel: 3, toLevel: 4, changedAt: "2025-10-03T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-011", fromLevel: 4, toLevel: 5, changedAt: "2025-10-03T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-001", fromLevel: 2, toLevel: 3, changedAt: "2026-08-08T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-002", fromLevel: 3, toLevel: 4, changedAt: "2026-09-08T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", fromLevel: 3, toLevel: 4, changedAt: "2026-10-08T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", fromLevel: 4, toLevel: 5, changedAt: "2026-10-02T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000003", skillCode: "DEMO-SKILL-004", fromLevel: 3, toLevel: 4, changedAt: "2026-08-25T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-009", fromLevel: 4, toLevel: 5, changedAt: "2026-10-04T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000006", skillCode: "DEMO-SKILL-010", fromLevel: 3, toLevel: 4, changedAt: "2026-09-12T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", fromLevel: 3, toLevel: 4, changedAt: "2026-09-20T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-017", fromLevel: 2, toLevel: 3, changedAt: "2026-08-28T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000002", skillCode: "DEMO-SKILL-016", fromLevel: 4, toLevel: 5, changedAt: "2026-10-01T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-222222222222", skillCode: "DEMO-SKILL-016", fromLevel: 2, toLevel: 3, changedAt: "2026-09-16T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000009", skillCode: "DEMO-SKILL-004", fromLevel: 2, toLevel: 3, changedAt: "2026-08-14T09:00:00.000Z" },
  { platformUserId: "22222222-2222-4222-8222-000000000007", skillCode: "DEMO-SKILL-013", fromLevel: 3, toLevel: 4, changedAt: "2026-10-06T09:00:00.000Z" }
] as const;

export const demoLevelUpReactions = [
  { levelChangePlatformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", memberPlatformUserId: "22222222-2222-4222-8222-000000000004", type: "CONGRATS" },
  { levelChangePlatformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", memberPlatformUserId: "22222222-2222-4222-8222-000000000004", type: "AMAZING" },
  { levelChangePlatformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", memberPlatformUserId: "22222222-2222-4222-8222-000000000004", type: "WANT_TO_LEARN" }
] as const;

export const demoLevelUpComments = [
  { levelChangePlatformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", authorPlatformUserId: "22222222-2222-4222-8222-000000000004", body: "着実な成長ですね。次の挑戦も応援しています！" },
  { levelChangePlatformUserId: "22222222-2222-4222-8222-000000000005", skillCode: "DEMO-SKILL-005", authorPlatformUserId: "22222222-2222-4222-8222-000000000004", body: "Lv.5到達おめでとうございます！" }
] as const;

export const seedMemberMapping = [
  { legacyMemberKey: "TM0001", platformUserId: "22222222-2222-4222-8222-222222222222", devkitUserName: "佐藤 花子" },
  { legacyMemberKey: "TM0002", platformUserId: "22222222-2222-4222-8222-000000000004", devkitUserName: "田中 健太" },
  { legacyMemberKey: "TM0003", platformUserId: "22222222-2222-4222-8222-000000000005", devkitUserName: "伊藤 さくら" },
  { legacyMemberKey: "TM0101", platformUserId: "22222222-2222-4222-8222-000000000005", devkitUserName: "伊藤 さくら" },
  { legacyMemberKey: "TM0102", platformUserId: "22222222-2222-4222-8222-000000000003", devkitUserName: "高橋 美咲" },
  { legacyMemberKey: "TM0103", platformUserId: "22222222-2222-4222-8222-000000000007", devkitUserName: "山本 陽菜" },
  { legacyMemberKey: "TM0104", platformUserId: "22222222-2222-4222-8222-000000000006", devkitUserName: "渡辺 大輔" },
  { legacyMemberKey: "TM0105", platformUserId: "22222222-2222-4222-8222-000000000005", devkitUserName: "伊藤 さくら" },
  { legacyMemberKey: "TM0106", platformUserId: "22222222-2222-4222-8222-000000000005", devkitUserName: "伊藤 さくら" },
  { legacyMemberKey: "TM0107", platformUserId: "22222222-2222-4222-8222-000000000002", devkitUserName: "鈴木 一郎" },
  { legacyMemberKey: "TM0108", platformUserId: "22222222-2222-4222-8222-222222222222", devkitUserName: "佐藤 花子" },
  { legacyMemberKey: "TM0109", platformUserId: "22222222-2222-4222-8222-000000000009", devkitUserName: "小林 直樹" },
  { legacyMemberKey: "TM0110", platformUserId: "22222222-2222-4222-8222-000000000007", devkitUserName: "山本 陽菜" },
  { legacyMemberKey: "TM0111", platformUserId: "22222222-2222-4222-8222-000000000008", devkitUserName: "中村 翔" }
] as const;

export function buildSkillAssessmentRequestNotificationBody(
  memberName: string,
  skillName: string,
  requestedLevel: number
) {
  return `${memberName} が ${skillName} Lv.${requestedLevel} を申告しました。`;
}
