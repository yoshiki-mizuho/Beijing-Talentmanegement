# アーキテクチャ方針

## 目的

このドキュメントは、タレントマネジメントシステムの初期アーキテクチャ方針を定義するものです。

本システムは、1リポジトリ、1デプロイ単位のNext.jsアプリケーションとして開始します。ただし、内部構造は業務領域ごとに責務を分けるモジュラーモノリス型とします。

## モジュラーモノリスを採用する理由

タレントマネジメントシステムでは、メンバー、スキル、ロール、スキルマップ、監査、AI評価など、業務上の境界が比較的明確です。一方で、初期段階からマイクロサービス化すると、認証、デプロイ、監視、トランザクション、データ整合性の複雑さが先に増えます。

そのため、初期は単一アプリケーションとして開発速度と運用の単純さを保ちながら、内部のモジュール境界を明確にします。将来、外部連携、AI評価ジョブ、CSV取り込みなどを独立させる必要が出た場合にも、分離しやすい構造を目指します。

## 初期モジュール

| モジュール | 主な責務 |
| --- | --- |
| `members` | メンバー情報、部署、所属、プロフィール、メンバー検索 |
| `skills` | スキル定義、カテゴリ、レベル説明、スキル検索 |
| `roles` | ロール定義、必要スキル、必要レベル、ロール達成判定 |
| `skill-map` | メンバーとスキルのマトリクス表示、スキル分布の可視化 |
| `dashboard` | 統計、アクションアイテム、集計カード、全体サマリー |
| `csv-import` | CSV import/export、プレビュー、検証、差分確認、一括登録 |
| `auth` | 認証、セッション、ユーザー、権限ロール |
| `audit` | 監査ログ、操作履歴、変更差分、import履歴 |
| `ai-evaluation` | AI評価、評価結果キャッシュ、再評価、利用ログ、フォールバック |

## レイヤー構成

各業務モジュールは、原則として以下のレイヤーに分けます。

| レイヤー | 役割 |
| --- | --- |
| `domain` | 業務ルール、エンティティ、値オブジェクト、ドメインサービス |
| `application` | use case、トランザクション境界、入力/出力DTO |
| `infrastructure` | Prisma repository、外部API、永続化、技術詳細 |
| `presentation` | 画面コンポーネント、Server Actions、Route Handlers、フォーム |

小さなモジュールでは全レイヤーを無理に作らず、複雑さが出た時点で分割します。ただし、DBアクセスや外部API呼び出しを画面コンポーネントへ直接置くことは避けます。

## 初期ディレクトリ構成

Phase 0時点の初期案として、アプリケーションコードは以下の構成から開始します。

```text
src/
  app/
    (app)/
      members/
      skills/
      roles/
      skill-map/
      dashboard/
    api/
  modules/
    members/
      domain/
      application/
      infrastructure/
      presentation/
    skills/
      domain/
      application/
      infrastructure/
      presentation/
    roles/
      domain/
      application/
      infrastructure/
      presentation/
    skill-map/
    dashboard/
    csv-import/
    auth/
    audit/
    ai-evaluation/
  shared/
    ui/
    lib/
    types/
  server/
    db/
    auth/
prisma/
  schema.prisma
```

配置ルールは以下です。

- 画面ルーティングは `src/app` に置き、業務ロジックは原則として `src/modules/<module>` に置く。
- `src/modules/<module>/domain` はフレームワークやDB実装に依存しない純粋な業務ルールを置く。
- `src/modules/<module>/application` はuse case、DTO、トランザクション境界を置く。
- `src/modules/<module>/infrastructure` はPrisma repository、外部API、永続化の実装詳細を置く。
- `src/modules/<module>/presentation` は該当モジュール専用のフォーム、Server Actions、Route Handlers、画面補助部品を置く。
- `src/shared` は複数モジュールで利用する汎用UI、純粋なユーティリティ、横断DTOに限定する。
- `src/server/db` と `src/server/auth` はPrisma ClientやAuth.js設定など、アプリ全体で1つだけ持つサーバー基盤を置く。
- Prisma schemaはPhase 2開始時点では `prisma/schema.prisma` から開始し、肥大化した場合に分割方針を再検討する。

## 依存方向

依存方向は以下を基本とします。

```text
presentation -> application -> domain
application -> infrastructure
infrastructure -> domain
```

ルールは以下です。

- `domain` はNext.js、Prisma、React、外部APIへ依存しない。
- `application` はuse caseを表現し、画面やDBの詳細を持たない。
- `infrastructure` はPrismaや外部APIなど技術詳細を閉じ込める。
- `presentation` はUIとリクエスト/レスポンス境界を担当する。
- 他モジュールの `infrastructure` へ直接依存しない。
- モジュール間連携は公開されたuse caseまたはservice経由にする。

## 禁止事項

- 他モジュールのPrisma repositoryを直接呼び出す。
- 画面コンポーネントからPrisma Clientを直接呼び出す。
- `domain` にReact、Next.js、Prismaの型を持ち込む。
- 共有ディレクトリへ業務ロジックを無秩序に置く。
- 汎用化を急ぎ、実際の重複や複雑さがない段階で抽象化を増やす。
- 将来のマイクロサービス化だけを理由に、初期実装を過度に分散させる。

## 共有コードの扱い

共有コードは、複数モジュールで実際に必要になったものだけを共通化します。

共通化してよいものの例:

- 汎用UIコンポーネント
- 日付、文字列、数値などの純粋なユーティリティ
- 認証済みユーザー取得など横断的なヘルパー
- 共通エラー型
- ページネーションやソートの共通DTO

共通化を避けるものの例:

- 特定モジュール固有の業務判断
- 特定画面専用のフォームロジック
- まだ2箇所以上で使われていない処理

## Phase 0での位置づけ

このドキュメントは初期ルールです。ここで定義したディレクトリ構成はPhase 2で実装を開始するための出発点とし、DBスキーマ、画面一覧、CSV項目定義はPhase 1以降で具体化します。
