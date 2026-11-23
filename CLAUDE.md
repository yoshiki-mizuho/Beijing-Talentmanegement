# CLAUDE.md

@AGENTS.md

## Claude Codeの役割

このリポジトリでは、Claude Codeが設計、タスク指示、意思決定支援、受け入れ判定を担当し、Codexが実装、バグ修正、原因調査を担当する。詳細は `docs/AI_COLLABORATION.md` を正とする。

- 実装は原則として、タスク指示書を作成してから `codex:codex-rescue` サブエージェントでCodexに依頼する。数行程度のドキュメント修正や設定修正はClaudeが直接行ってよい。
- Codexの完了報告はそのまま受け入れない。`git diff` のレビューと検証コマンドの実行を自分で行い、その結果を根拠に完了を判定する。
- 画面に影響する変更は、ブラウザで3ロール（ADMIN、MANAGER、MEMBER）の動作を確認する。
- 設計判断が分かれる場合は、選択肢と推奨案をユーザーに示して判断を仰ぐ。
- Windows環境のため、npmは `npm.cmd` で実行する。

## Hub 基盤の決まり

TalentHub は Hub シリーズの製品 `talenthub` として、基盤（共通のログイン・テナント・社員情報・クラスタ）の上で動かす。次のファイルが、基盤との約束（してはいけないこと、必ずすること）の要約。表・数値・手順は、その中の「読む資料」の表に従って、作業の前に読む。`contract/` の中と、`scripts/` の `update-contract.sh`・`hub-contracts.sh`・`devkit.sh`、`.claude/skills/hub-*/` は基盤の持ち物。書き換えない（版を上げるときは `scripts/update-contract.sh <版>`）。

@contract/hub-platform-for-claude.md

**今は載せ替えの途中（フェーズ H）**。今のコードには、まだ自前のログイン・社員と部署の表・テナントの無い DB などが残っている。決まりに合わない箇所は、`.claude/skills/migrate-to-hub` の順番（H-2 身元と書き込み → H-3 テナント分離 → H-4 社員・組織 → H-5 LLM → H-6 見た目 → H-7 載せる）で直す。段をまたいで直さない。

作業の手順は、基盤が配るスキル（`.claude/skills/hub-*/`）にある。当たる作業の前に使う。

| 作業 | スキル |
|---|---|
| 画面や API を変えた後に、手元（hub-devkit）で通して確かめる。済んだら必ず止める | `hub-local-check` |
| サービス・経路（URL のパス）を足す | `hub-add-route` |
| 基盤の gRPC・通知・LLM・REST を使う | `hub-platform-api` |
| ほかの Hub の情報や基盤に無いものが要る、この Hub の口をほかの Hub 向けに出す | `hub-other-hub` |
| 基盤の契約の版を上げる | `hub-contract-update` |
| 既存のアプリを Hub に載せ替える（この載せ替えの全体の手順） | `migrate-to-hub` |
| 運用中に issue をきっかけに直す・issue を起票する（フェーズ H の後から） | `issue-flow` |

## この Hub の決まり

- 製品名: `talenthub`（namespace は `talenthub-dev` / `talenthub-prod`）
- パス: 画面は `/talent`（`src/app/talent/`）、API は `/api/talent/v1`（`src/app/api/talent/v1/`）。`basePath` は使わず、JS・CSS は `assetPrefix: "/talent"` で `/talent/_next/...` から読む（`basePath` では API を `/api/talent/v1` に置けないため）
- 言語・フレームワーク: TypeScript、Next.js 16（App Router、`output: "standalone"`）、Prisma 7、PostgreSQL
- ディレクトリと層の分け方: モジュラーモノリス（`src/modules/<モジュール>/{domain,application,infrastructure,presentation}`）。`docs/ARCHITECTURE.md` を正とする
- ビルドのコマンド: `npm.cmd run build`
- 型の検査・lint のコマンド: `npm.cmd run typecheck`、`npm.cmd run lint`
- テストのコマンド: `npx.cmd vitest run`（単体）、E2E は `docs/LOCAL_DEVELOPMENT.md`
- 定義からコードを作るコマンド: `npm.cmd run prisma:generate`
- マイグレーションの道具と、ファイルの置き場所: Prisma Migrate（`prisma/migrations/`）。クラスタでは `migrate` のジョブで `prisma migrate deploy` を流す
- DB とテナント分離の方式: 全テーブルに `tenant_id` を持たせて行単位の制限（RLS）を有効にし、リクエストごとに入口で受け取ったテナントの ID を `app.tenant_id` に設定してから読み書きする（`src/server/db/prisma.ts`。リクエストの外では `runWithTenant`）。`SkillLevel` と、定期実行で使うテナント ID だけを持つ `HubTenant` はテナントに依らない共通の表。手元はアプリ用のロール `talent_app` で動かし、RLS を確かめる（`docs/LOCAL_DEVELOPMENT.md`）
