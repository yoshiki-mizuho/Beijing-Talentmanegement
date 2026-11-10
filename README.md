# TalentHub

社内メンバーのスキルを見える化し、成長を後押しするタレントマネジメントシステムです。メンバーがスキルを申請し、マネージャーが承認し、組織としてスキルの強みと不足を把握します。

## 主な機能

- スキルシートでの申請と、マネージャーによる承認
- 個人・チーム・組織のダッシュボード、スキルマップ
- 目標ロールと達成状況、レベルアップの演出、バッジ、月の振り返り
- 人を探す、スキルプロフィール、応援、1on1メモ
- CSVの取り込みと出力、監査ログ
- AIによる育成のヒント（マネージャーと管理者向け）

## 技術構成

Next.js 16（App Router）、TypeScript、Tailwind CSS、PostgreSQL、Prisma、NextAuth v4、Vitest、Playwright、GitLab CI/CD。詳しくは [`docs/TECH_STACK.md`](docs/TECH_STACK.md) を確認してください。

## はじめかた

ローカルでの初回セットアップ、起動、検証コマンドは [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) にまとめています。

よく使うコマンドは次のとおりです（Windowsでは `npm.cmd`）。

| コマンド | 内容 |
| --- | --- |
| `npm.cmd run dev` | 開発サーバーを起動する |
| `npm.cmd run verify` | 型チェック、lint、単体テスト、ビルド、migrationの検査をまとめて実行する |
| `npm.cmd run test:e2e` | E2Eテストを実行する |
| `npm.cmd run ui:check` | 3ロールの主要画面を撮影する |
| `npm.cmd run db:seed` | デモデータを投入する |

## フォルダ構成

| 場所 | 内容 |
| --- | --- |
| `src/app/` | 画面とAPIのルーティング |
| `src/modules/` | 業務領域ごとのモジュール（メンバー、スキル、ロールなど） |
| `src/shared/` | 複数モジュールで使う部品とユーティリティ |
| `src/server/` | DB接続、認証、セキュリティの土台 |
| `prisma/` | DBスキーマ、migration、seed |
| `e2e/` | PlaywrightのE2Eテストと画面撮影 |
| `scripts/` | 検証とデータ掃除のスクリプト |
| `docs/` | 設計と運用のドキュメント |

## ドキュメント

| 知りたいこと | 文書 |
| --- | --- |
| 開発の順序と今の状態 | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| 技術の選定理由 | [`docs/TECH_STACK.md`](docs/TECH_STACK.md) |
| モジュールの分け方と依存のルール | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| 業務の用語とデータの関係 | [`docs/DOMAIN_DESIGN.md`](docs/DOMAIN_DESIGN.md) |
| 画面の一覧と操作の流れ | [`docs/SCREEN_AND_FLOW.md`](docs/SCREEN_AND_FLOW.md) |
| 権限、CSV、監査ログ | [`docs/CSV_PERMISSION_AUDIT.md`](docs/CSV_PERMISSION_AUDIT.md) |
| 画面のデザインと文言 | [`docs/DESIGN_GUIDELINES.md`](docs/DESIGN_GUIDELINES.md) |
| セキュリティの対策と受け入れたリスク | [`docs/SECURITY.md`](docs/SECURITY.md) |
| ブランチ、Merge Request、CI | [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md) |
| デモ環境（Vercel + Neon）の運用 | [`docs/DEMO_DEPLOYMENT.md`](docs/DEMO_DEPLOYMENT.md) |
| Claude CodeとCodexの役割分担 | [`docs/AI_COLLABORATION.md`](docs/AI_COLLABORATION.md) |
| 過去のフェーズの記録 | [`docs/archive/`](docs/archive/README.md) |

`AGENTS.md` と `CLAUDE.md` は、AIのコーディングエージェント向けの作業ガイドです。
