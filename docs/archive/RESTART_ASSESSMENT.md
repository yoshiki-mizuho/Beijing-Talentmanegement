# 再始動時の現状棚卸し（2026-10-09）

## 目的

Claude CodeとCodexの協業体制（`docs/AI_COLLABORATION.md`）で開発を再始動するにあたり、コード、環境、運用の現状を確認し、優先度付きの対応リストを残す。

## 確認結果

| 項目 | 結果 | 備考 |
| --- | --- | --- |
| `npm.cmd run typecheck` | OK | |
| `npm.cmd run lint` | OK | |
| `npm.cmd run test` | OK | 27 files / 96 tests passed |
| `npm.cmd run build` | OK | |
| `npm.cmd run prisma:migrate:check` | OK | ネイティブPostgreSQL 17で、migration差分なし |
| migrate deploy / seed | OK | ネイティブPostgreSQL 17に適用 |
| 3ロールの画面確認 | OK | ADMIN: dashboard、members、skills、skill-mapを表示。MANAGER: 同上、`/csv` はdashboardへリダイレクト。MEMBER: 本人向けdashboardを表示、`/members` はdashboardへリダイレクト |

## 停滞の原因として確認できたもの

| 原因 | 状況 | 対応 |
| --- | --- | --- |
| Codexがシェルコマンドを実行できない | `~/.codex/config.toml` の `[windows] sandbox = "elevated"` により `helper_unknown_error: setup refresh had errors` が発生し、ファイルの読み取りや検証コマンドが失敗していた | `unelevated` に変更して解消（2026-10-09） |
| Docker Desktopのクラッシュ | 物理メモリ約7.6GB、`.wslconfig` で `memory=1GB`。Linux VMがメモリ不足になる | 日常の開発はネイティブPostgreSQLへ移行（`docs/LOCAL_DEVELOPMENT.md`） |
| 実装者自身による完了判定 | 検証できない状態でも完了と報告され得た | Claudeによる独立検証を開発ループに組み込んだ |
| ローカル `main` の未push | Vercel + Neonデモ準備がローカルの `main` にのみmergeされていた | MR !7 として取り込み直し、ローカル `main` を `origin/main` に戻した |
| ドキュメントの状態不整合 | `AGENTS.md` の現在の状態が「次はPhase3」のままだった | Phase4.5進行中に更新 |

## 対応リスト

| 優先度 | 内容 | 対応先 |
| --- | --- | --- |
| 高 | GitLab CIが `workflow: rules: when: never` で全停止している。MR時だけ必須チェックを実行する設定にする | Step 3（`chore/restore-ci`） |
| 高 | 検証コマンドを `npm.cmd run verify` に集約し、ClaudeとCodexが同じコマンドで検証できるようにする | Step 3 |
| 高 | seedはユーザー3名のみで、スキル、カテゴリ、ロールが空。デモでダッシュボードやスキルマップが空表示になる。架空のデモデータを用意する | Phase 4.5 |
| 中 | `next.config.ts` が `output: "standalone"` のため、`npm run start` で「`next start` は standaloneでは動作しない」という警告が出る。`start` scriptを実態に合わせる | Step 3 |
| 中 | 依存関係が `next-auth` v4 で、`docs/TECH_STACK.md` のAuth.js（v5）と表記がずれている。v5へ移行するか、ドキュメントを直すかを判断する | Phase 5の着手前 |
| 中 | Phase 4から持ち越した事項: manager向けの担当範囲による検索制限、メンバー詳細でのロール達成状況表示 | Phase 5 |
| 低 | E2Eがない。品質面の課題に対応するため、Playwrightでの主要フローE2EをPhase 7から前倒しするかを判断する | Phase 5の開始時 |
