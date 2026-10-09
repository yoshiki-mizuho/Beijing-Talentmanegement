export const demoDepartments = [
  { code: "INFRA", name: "インフラ部" },
  { code: "DESIGN", name: "デザイン部" },
  { code: "PMO", name: "PMO" }
] as const;

export const demoSkillCategories = [
  { name: "プログラミング言語", displayOrder: 10 },
  { name: "フレームワーク", displayOrder: 20 },
  { name: "クラウド・インフラ", displayOrder: 30 },
  { name: "データベース", displayOrder: 40 },
  { name: "マネジメント", displayOrder: 50 }
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

export const demoRoles = [
  {
    name: "フロントエンドエンジニア",
    description: "利用者向けWeb画面の設計と実装を担うロール",
    requirements: [
      { skillCode: "DEMO-SKILL-002", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-005", requiredLevel: 4, isRequired: true },
      { skillCode: "DEMO-SKILL-006", requiredLevel: 3, isRequired: true },
      { skillCode: "DEMO-SKILL-007", requiredLevel: 2, isRequired: false }
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

export const existingDemoMemberEmployeeNos = ["TM0001", "TM0002", "TM0003"] as const;

export const demoMembers = [
  {
    employeeNo: "TM0101",
    name: "デモメンバー01",
    email: "demo-member-101@example.com",
    departmentCode: "DEV",
    status: "ACTIVE",
    jobTitle: "フロントエンドエンジニア"
  },
  {
    employeeNo: "TM0102",
    name: "デモメンバー02",
    email: "demo-member-102@example.com",
    departmentCode: "DEV",
    status: "ACTIVE",
    jobTitle: "バックエンドエンジニア"
  },
  {
    employeeNo: "TM0103",
    name: "デモメンバー03",
    email: "demo-member-103@example.com",
    departmentCode: "INFRA",
    status: "ACTIVE",
    jobTitle: "クラウドエンジニア"
  },
  {
    employeeNo: "TM0104",
    name: "デモメンバー04",
    email: "demo-member-104@example.com",
    departmentCode: "INFRA",
    status: "ACTIVE",
    jobTitle: "インフラエンジニア"
  },
  {
    employeeNo: "TM0105",
    name: "デモメンバー05",
    email: "demo-member-105@example.com",
    departmentCode: "DESIGN",
    status: "ACTIVE",
    jobTitle: "UIエンジニア"
  },
  {
    employeeNo: "TM0106",
    name: "デモメンバー06",
    email: "demo-member-106@example.com",
    departmentCode: "DESIGN",
    status: "LEAVE",
    jobTitle: "UXデザイナー"
  },
  {
    employeeNo: "TM0107",
    name: "デモメンバー07",
    email: "demo-member-107@example.com",
    departmentCode: "PMO",
    status: "ACTIVE",
    jobTitle: "プロジェクトリーダー"
  },
  {
    employeeNo: "TM0108",
    name: "デモメンバー08",
    email: "demo-member-108@example.com",
    departmentCode: "PMO",
    status: "ACTIVE",
    jobTitle: "プロジェクトコーディネーター"
  },
  {
    employeeNo: "TM0109",
    name: "デモメンバー09",
    email: "demo-member-109@example.com",
    departmentCode: "DEV",
    status: "INACTIVE",
    jobTitle: "アプリケーションエンジニア"
  },
  {
    employeeNo: "TM0110",
    name: "デモメンバー10",
    email: "demo-member-110@example.com",
    departmentCode: "INFRA",
    status: "ACTIVE",
    jobTitle: "データベースエンジニア"
  },
  {
    employeeNo: "TM0111",
    name: "デモメンバー11",
    email: "demo-member-111@example.com",
    departmentCode: "DESIGN",
    status: "ACTIVE",
    jobTitle: "デザインアシスタント"
  }
] as const;

export const demoMemberSkills = [
  { employeeNo: "TM0001", skillCode: "DEMO-SKILL-016", level: 4, yearsOfExperience: 6 },
  { employeeNo: "TM0001", skillCode: "DEMO-SKILL-017", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0001", skillCode: "DEMO-SKILL-018", level: 3, yearsOfExperience: 4 },
  { employeeNo: "TM0002", skillCode: "DEMO-SKILL-002", level: 4, yearsOfExperience: 7 },
  { employeeNo: "TM0002", skillCode: "DEMO-SKILL-005", level: 4, yearsOfExperience: 6 },
  { employeeNo: "TM0002", skillCode: "DEMO-SKILL-006", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0002", skillCode: "DEMO-SKILL-016", level: 4, yearsOfExperience: 6 },
  { employeeNo: "TM0002", skillCode: "DEMO-SKILL-017", level: 5, yearsOfExperience: 7 },
  { employeeNo: "TM0002", skillCode: "DEMO-SKILL-018", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0003", skillCode: "DEMO-SKILL-001", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0003", skillCode: "DEMO-SKILL-002", level: 3, yearsOfExperience: 2.5 },
  { employeeNo: "TM0003", skillCode: "DEMO-SKILL-005", level: 3, yearsOfExperience: 2 },
  { employeeNo: "TM0003", skillCode: "DEMO-SKILL-013", level: 2, yearsOfExperience: 1.5 },
  { employeeNo: "TM0101", skillCode: "DEMO-SKILL-001", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0101", skillCode: "DEMO-SKILL-002", level: 4, yearsOfExperience: 4 },
  { employeeNo: "TM0101", skillCode: "DEMO-SKILL-005", level: 5, yearsOfExperience: 5 },
  { employeeNo: "TM0101", skillCode: "DEMO-SKILL-006", level: 4, yearsOfExperience: 3 },
  { employeeNo: "TM0101", skillCode: "DEMO-SKILL-007", level: 3, yearsOfExperience: 2 },
  { employeeNo: "TM0102", skillCode: "DEMO-SKILL-004", level: 4, yearsOfExperience: 6 },
  { employeeNo: "TM0102", skillCode: "DEMO-SKILL-008", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0102", skillCode: "DEMO-SKILL-013", level: 3, yearsOfExperience: 4 },
  { employeeNo: "TM0102", skillCode: "DEMO-SKILL-014", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0103", skillCode: "DEMO-SKILL-003", level: 3, yearsOfExperience: 4 },
  { employeeNo: "TM0103", skillCode: "DEMO-SKILL-009", level: 5, yearsOfExperience: 7 },
  { employeeNo: "TM0103", skillCode: "DEMO-SKILL-011", level: 5, yearsOfExperience: 6 },
  { employeeNo: "TM0103", skillCode: "DEMO-SKILL-012", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0103", skillCode: "DEMO-SKILL-013", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0104", skillCode: "DEMO-SKILL-009", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0104", skillCode: "DEMO-SKILL-010", level: 4, yearsOfExperience: 5 },
  { employeeNo: "TM0104", skillCode: "DEMO-SKILL-011", level: 4, yearsOfExperience: 4 },
  { employeeNo: "TM0104", skillCode: "DEMO-SKILL-012", level: 3, yearsOfExperience: 2 },
  { employeeNo: "TM0105", skillCode: "DEMO-SKILL-001", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0105", skillCode: "DEMO-SKILL-002", level: 3, yearsOfExperience: 2 },
  { employeeNo: "TM0105", skillCode: "DEMO-SKILL-005", level: 4, yearsOfExperience: 4 },
  { employeeNo: "TM0105", skillCode: "DEMO-SKILL-006", level: 3, yearsOfExperience: 2 },
  { employeeNo: "TM0105", skillCode: "DEMO-SKILL-017", level: 2, yearsOfExperience: 1 },
  { employeeNo: "TM0105", skillCode: "DEMO-SKILL-018", level: 3, yearsOfExperience: 2 },
  { employeeNo: "TM0106", skillCode: "DEMO-SKILL-005", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0106", skillCode: "DEMO-SKILL-006", level: 2, yearsOfExperience: 1 },
  { employeeNo: "TM0106", skillCode: "DEMO-SKILL-017", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0106", skillCode: "DEMO-SKILL-018", level: 2, yearsOfExperience: 1 },
  { employeeNo: "TM0107", skillCode: "DEMO-SKILL-002", level: 2, yearsOfExperience: 2 },
  { employeeNo: "TM0107", skillCode: "DEMO-SKILL-009", level: 2, yearsOfExperience: 2 },
  { employeeNo: "TM0107", skillCode: "DEMO-SKILL-016", level: 5, yearsOfExperience: 8 },
  { employeeNo: "TM0107", skillCode: "DEMO-SKILL-017", level: 5, yearsOfExperience: 7 },
  { employeeNo: "TM0107", skillCode: "DEMO-SKILL-018", level: 4, yearsOfExperience: 6 },
  { employeeNo: "TM0108", skillCode: "DEMO-SKILL-016", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0108", skillCode: "DEMO-SKILL-017", level: 2, yearsOfExperience: 2 },
  { employeeNo: "TM0108", skillCode: "DEMO-SKILL-018", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0109", skillCode: "DEMO-SKILL-003", level: 2, yearsOfExperience: 1 },
  { employeeNo: "TM0109", skillCode: "DEMO-SKILL-004", level: 3, yearsOfExperience: 4 },
  { employeeNo: "TM0109", skillCode: "DEMO-SKILL-008", level: 3, yearsOfExperience: 3 },
  { employeeNo: "TM0109", skillCode: "DEMO-SKILL-014", level: 2, yearsOfExperience: 2 },
  { employeeNo: "TM0110", skillCode: "DEMO-SKILL-013", level: 4, yearsOfExperience: 6 },
  { employeeNo: "TM0110", skillCode: "DEMO-SKILL-015", level: 3, yearsOfExperience: 3 }
] as const;

export const demoSkillAssessments = [
  {
    employeeNo: "TM0003",
    skillCode: "DEMO-SKILL-005",
    requestedLevel: 4,
    yearsOfExperience: 3
  },
  {
    employeeNo: "TM0003",
    skillCode: "DEMO-SKILL-011",
    requestedLevel: 3,
    yearsOfExperience: 2
  }
] as const;

export function buildSkillAssessmentRequestNotificationBody(
  memberName: string,
  skillName: string,
  requestedLevel: number
) {
  return `${memberName} が ${skillName} Lv.${requestedLevel} を申告しました。`;
}
