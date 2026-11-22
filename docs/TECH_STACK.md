# テックスタック方針

## 目的

このドキュメントは、TalentHub（タレントマネジメントシステム）のテックスタックと設計方針を記録するものです。

## テックスタック

### Core

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| フレームワーク | Next.js 16系 App Router | フロントエンドとBFF/APIを同一リポジトリで管理する |
| 言語 | TypeScript | 型安全性を前提に開発する |
| Runtime | Node.js 24 LTS | LTS系を利用し、長期運用に備える。セキュリティの修正版を下限にする（2026-10-23 時点で 24.22.1 以上。`package.json` の `engines` と CI のイメージで固定） |
| スタイリング | Tailwind CSS | 画面実装速度を保つ |
| UIコンポーネント | `src/shared/ui` の自前の部品（shadcn/uiの書き方に倣う） | フォーム、Dialog、TableなどのUIを標準化する |
| アイコン | lucide-react | 一貫したアイコン体系を利用する |

### Data/Auth

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| Database | PostgreSQL | メンバー、スキル、ロール、評価履歴、監査ログなどのリレーション管理に利用する |
| ORM | Prisma | 型安全なDBアクセス、マイグレーション、スキーマ管理を行う |
| Validation | Zod | フォーム、API入力、CSV importの検証を共通化する |
| Authentication | Hub 基盤の入口 | `X-Auth-*` ヘッダから身元を受け取り、基盤の利用者 ID と Hub 内の権限を結び付ける |

### Frontend Utilities

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| Data Fetching | Server Components中心、必要箇所のみ TanStack Query | 一覧検索やインライン更新など、クライアント状態が濃い画面で利用する |
| Table | TanStack Table | メンバー一覧、スキル一覧、ロール一覧、CSVプレビューで利用する |
| Form | React Hook Form | 入力フォームの状態管理とバリデーション連携に利用する |

### AI

| 領域 | 採用技術 | 方針 |
| --- | --- | --- |
| AI API | Hub 基盤の LLM | 画面では予約だけを作り、定期実行から基盤を呼ぶ |
| AI評価 | 非同期ジョブ | 再評価、ジョブ履歴、失敗時フォールバックを設ける |

LLM は Hub 基盤の gRPC を通して呼び、外部の LLM を直接呼びません。

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

フロントエンドとBFF/APIを1つのリポジトリで管理できます。全体をクライアントコンポーネントへ寄せるのではなく、Server Components、Route Handlers、Server Actionsを活用し、データ取得や更新処理をサーバー側へ寄せます。

### PostgreSQL + Prisma

タレントマネジメントでは、メンバー、部署、スキル、ロール、案件、アサイン、評価履歴など、関係性のあるデータが中心になります。PostgreSQLを主DBとし、Prismaでスキーマ、マイグレーション、型安全なDBアクセスを管理します。

### Hub 基盤の入口

ログイン、セッション、パスワードは Hub 基盤が管理します。TalentHub は `src/server/auth/session.ts` でリクエストごとの `X-Auth-*` ヘッダを読み、`platformUserId` で Hub 内の利用者とメンバーを解決します。ADMIN は基盤のロール、MANAGER は Hub 内のロールで決めます。

### Zod + React Hook Form

画面入力、API入力、CSV importで同じ検証ルールを使えるようにします。CSV取り込みは業務データの品質に直結するため、登録前の検証とエラー表示を標準化します。

### GitLab CI/CD

このプロジェクトはGitLabリポジトリを前提とするため、CI/CDはGitLab CI/CDへ統一します。GitLab SAST、GitLab Container Registry、GitLab Environmentsを利用し、コード検査からコンテナビルド、環境別デプロイまでを一貫して管理します。

## 設計上の方針

- データはPostgreSQL + Prismaで持ち、Repositoryパターンでアクセスする。
- 集計処理はDBクエリ、API、Server Component側に置く。
- CSV importは即時登録ではなく、プレビュー、検証エラー表示、差分確認、トランザクション登録を行う。
- メンバー自身のスキル申告とmanager承認・補正フローを前提に、通知機能を持つ。
- AIは画面から予約し、定期実行、作り直し、ジョブ履歴、失敗時フォールバックを設ける。
- 重要な操作は監査ログに記録する。
- 型定義は単一ファイルへ集中させず、DB schema、domain model、DTO、form schemaを分離する。
- 認証と認可を組み込み、操作権限を明確にする。
- E2Eテストで主要業務フローの回帰を検知する。

## GitLab CI/CD方針

現在のパイプラインの詳細は `docs/DEVELOPMENT_WORKFLOW.md` を確認します。Merge Request時には、以下を必須チェックとします。

- lint
- typecheck
- unit test
- build
- migration check
- SAST

本番化（Phase 7）では、`main` マージ後に以下を実行する想定です。まだ実装していません。

- Docker image build
- GitLab Container Registryへのpush
- dev環境へのdeploy

staging、productionへのdeployはGitLab Environmentsで管理し、本番反映前にはmanual approvalを挟みます。DB migrationは本番自動適用を避け、dry-runまたはmigration checkを経て、承認後に実行します。

## 将来拡張の判断基準

- SQLを細かく制御する必要が強くなった場合は、ORMとしてDrizzleの採用を再検討する。
- 大規模バッチ、外部人事システム連携、AI評価ジョブが増えた場合は、Next.js内の処理から独立したWorker/Job基盤への分離を検討する。
- 部署やグループ会社単位でデータ分離が必要になった場合は、テナント設計、RLS、組織階層モデルを検討する。
- AI利用量が増えた場合は、プロンプト管理、評価結果キャッシュ、ジョブ実行基盤を整備する。
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
- 監査ログの保持期間。

### 決定済みの事項

- 権限ロールは `admin`、`manager`、`member` の3つ（`docs/CSV_PERMISSION_AUDIT.md`）。
- AIは画面操作で予約し、定期実行から Hub 基盤の LLM を呼び出して結果をDBに保存する。
- CSV importに承認フローは設けない（`admin`だけが行い、差分プレビューで確認する）。
