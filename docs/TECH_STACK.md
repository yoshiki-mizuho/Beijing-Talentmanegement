# テックスタック方針

## 目的

このドキュメントは、タレントマネジメントシステムを新規構築するにあたり、MVPアプリの構成を踏まえた推奨テックスタックと設計方針を記録するものです。

MVPでは、Next.js、TypeScript、Tailwind CSS、localStorage、Repositoryパターンを用いて、メンバー、スキル、ロール、スキルマップ、AI評価の基本機能が実装されていました。新システムではこの方向性を活かしつつ、本番運用に必要なデータ永続化、認証、監査、CI/CD、デプロイ基盤を明確化します。

## MVP構成の前提

- フレームワークは Next.js App Router。
- 言語は TypeScript。
- スタイリングは Tailwind CSS。
- データ永続化は localStorage。
- データアクセス層は Repositoryパターンで抽象化済み。
- 主な機能はメンバー管理、スキル管理、ロール管理、スキル検索、スキルマップ、統計ダッシュボード、AI評価。
- 将来的な PostgreSQL 移行を意識した構成になっている。

## 推奨テックスタック

### Core

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| フレームワーク | Next.js 16系 App Router | フロントエンドとBFF/APIを同一リポジトリで管理する |
| 言語 | TypeScript | 型安全性を前提に開発する |
| Runtime | Node.js 24 LTS | LTS系を利用し、長期運用に備える |
| スタイリング | Tailwind CSS | MVPの流れを継承し、画面実装速度を保つ |
| UIコンポーネント | shadcn/ui | フォーム、Dialog、TableなどのUIを標準化する |
| アイコン | lucide-react | 一貫したアイコン体系を利用する |

### Data/Auth

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| Database | PostgreSQL | メンバー、スキル、ロール、評価履歴、監査ログなどのリレーション管理に利用する |
| ORM | Prisma | 型安全なDBアクセス、マイグレーション、スキーマ管理を行う |
| Validation | Zod | フォーム、API入力、CSV importの検証を共通化する |
| Authentication | NextAuth v4（Auth.js） | 企業IdP連携を見据えて認証を抽象化する。企業IdP確定時にBetter Auth等への移行を判断する |

### Frontend Utilities

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| Data Fetching | Server Components中心、必要箇所のみ TanStack Query | 一覧検索やインライン更新など、クライアント状態が濃い画面で利用する |
| Table | TanStack Table | メンバー一覧、スキル一覧、ロール一覧、CSVプレビューで利用する |
| Form | React Hook Form | 入力フォームの状態管理とバリデーション連携に利用する |

### AI

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| AI API | OpenAI互換API | サーバー側サービスとして隔離し、APIキーをクライアントへ露出させない |
| AI評価 | 非同期化・キャッシュ前提 | 必要に応じて再評価、ジョブ履歴、失敗時フォールバックを設ける |

### Testing

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| Unit Test | Vitest | ドメインロジック、Repository、ユーティリティを検証する |
| Component Test | Testing Library | UIコンポーネントとフォーム挙動を検証する |
| E2E Test | Playwright | 主要業務フローをブラウザ上で検証する |

### DevOps

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| CI/CD | GitLab CI/CD | GitLabリポジトリを前提にパイプラインを構成する |
| Container | Docker | アプリケーション実行環境をコンテナ化する |
| Deployment | Kubernetes | dev、staging、productionの環境差分を管理する |
| Security | GitLab SAST | GitLab標準のSASTテンプレートを継続利用する |
| Registry | GitLab Container Registry | mainマージ後のイメージ保存先として利用する |

### Phase 4完了時点のデモ環境

限定共有のデモ環境に限り、Vercelをアプリケーション実行基盤、NeonをPostgreSQL基盤として利用します。GitLabの`main`だけをVercel Productionへ自動デプロイし、Preview Deploymentは無効化します。これはPhase 7で整備するDocker + Kubernetes本番構成を置き換えるものではありません。

Vercelのアプリ実行時はNeonのpool接続を利用し、migrationと初回seedだけは作業端末からdirect接続で明示的に実行します。migrationやseedをVercelのbuildへ組み込まず、デモDBには架空データだけを保存します。

## 採用理由

### Next.js 16系 App Router

MVPがNext.js App Routerで構成されているため、画面構成やルーティング設計を継承しやすいです。新システムでは、MVPのように全体をクライアントコンポーネントへ寄せるのではなく、Server Components、Route Handlers、Server Actionsを活用し、データ取得や更新処理をサーバー側へ寄せます。

### PostgreSQL + Prisma

タレントマネジメントでは、メンバー、部署、スキル、ロール、案件、アサイン、評価履歴など、関係性のあるデータが中心になります。PostgreSQLを主DBとし、Prismaでスキーマ、マイグレーション、型安全なDBアクセスを管理します。

### NextAuth v4（Auth.js）

企業向けシステムでは認証方式が後から変わる可能性があります。NextAuth v4（`next-auth` 4.x、Auth.jsの旧称）を利用し、Microsoft Entra ID、Google、Keycloak、GitLabなどのIdP連携に備えます。初期権限は `admin`、`manager`、`member` 程度から開始し、将来的に部署や組織単位のRBACへ拡張できる形にします。

2025年9月以降、Auth.jsはBetter Authチームの管理下でセキュリティ修正のみのメンテナンスモードとなり、v5は2026年10月時点でもbetaのままです。そのため、v5へは移行せず、v4系の最新パッチを適用し続けます。

- 認証ライブラリへの依存は `src/server/auth/` と `src/modules/auth/` に閉じ込め、画面、API、業務ロジックは `getCurrentSession()` などの自前の境界を経由してセッションを参照する。
- RBACは自前のセッション型とロール判定の上に実装し、next-authの型や関数に直接依存させない。
- 利用する企業IdPが確定した時点で、Better Authなどの活発に保守されているライブラリへの移行を判断する。判断材料は、IdP連携の要件、移行コスト（ユーザー、アカウント、セッションのテーブル構造とパスワードハッシュの扱い）、ライブラリの保守状況とする。
- `next-auth` のセキュリティアドバイザリを確認し、v4系のパッチは速やかに適用する。

### Zod + React Hook Form

画面入力、API入力、CSV importで同じ検証ルールを使えるようにします。CSV取り込みは業務データの品質に直結するため、登録前の検証とエラー表示を標準化します。

### GitLab CI/CD

このプロジェクトはGitLabリポジトリを前提とするため、CI/CDはGitLab CI/CDへ統一します。GitLab SAST、GitLab Container Registry、GitLab Environmentsを利用し、コード検査からコンテナビルド、環境別デプロイまでを一貫して管理します。

## MVPからの改善ポイント

- localStorageを廃止し、PostgreSQL + Prismaへ移行する。
- Repositoryパターンは維持し、DB実装へ差し替える。
- クライアント側に集約されていた集計処理を、DBクエリ、API、Server Component側へ移す。
- CSV importは即時登録ではなく、プレビュー、検証エラー表示、差分確認、トランザクション登録を行う。
- メンバー自身のスキル申告とmanager承認・補正フローを前提に、通知機能を設計に含める。
- AI評価は画面から都度大量実行せず、キャッシュ、再評価、ジョブ履歴、失敗時フォールバックを設ける。
- 監査ログを最初から設計に含める。
- 型定義は単一ファイルへ集中させず、DB schema、domain model、DTO、form schemaを分離する。
- 認証と認可を最初から組み込み、操作権限を明確にする。
- E2Eテストを導入し、主要業務フローの回帰を検知する。

## GitLab CI/CD方針

Merge Request時には、以下を必須チェックとします。

- lint
- typecheck
- unit test
- build
- migration check
- SAST

`main` マージ後には、以下を実行します。

- Docker image build
- GitLab Container Registryへのpush
- dev環境へのdeploy

staging、productionへのdeployはGitLab Environmentsで管理し、本番反映前にはmanual approvalを挟みます。DB migrationは本番自動適用を避け、dry-runまたはmigration checkを経て、承認後に実行します。

## 将来拡張の判断基準

- SQLを細かく制御する必要が強くなった場合は、ORMとしてDrizzleの採用を再検討する。
- 大規模バッチ、外部人事システム連携、AI評価ジョブが増えた場合は、Next.js内の処理から独立したWorker/Job基盤への分離を検討する。
- 部署やグループ会社単位でデータ分離が必要になった場合は、テナント設計、RLS、組織階層モデルを検討する。
- AI利用量が増えた場合は、プロンプト管理、評価結果キャッシュ、利用ログ、コスト上限、モデル切り替えを整備する。
- APIを外部公開する必要が出た場合は、OpenAPI定義、API versioning、アクセストークン管理を追加する。

## 現時点の前提・未決事項

### 前提

- デプロイ先はDocker + Kubernetesを想定する。
- CI/CDはGitLab CI/CDを利用する。
- コンテナイメージはGitLab Container Registryで管理する。
- 認証は将来的な社内IdP連携を想定する。
- 初期構成はモジュラーモノリス型Next.jsアプリケーションとする。

### 未決事項

- 利用する企業IdPの種類。
- 本番、staging、devそれぞれのKubernetes環境構成。
- PostgreSQLの運用方式。
- 権限ロールの詳細。
- 監査ログの保持期間。
- AI評価を同期処理にするか、非同期ジョブにするかの初期実装方針。
- CSV importの承認フロー有無。
