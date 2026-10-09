# AI協業開発ガイド（Claude Code × Codex）

## 目的

このドキュメントは、Claude CodeとCodexの役割分担と、1タスクを完了させるまでの開発ループを定義するものです。

Codex単独で開発していた期間は、仕様とのズレや不具合の検証に時間がかかり、環境トラブルでも作業が止まりがちでした。そこで今後は、実装した本人とは別のエージェントが受け入れ判定を行う形にし、品質をそこで担保します。

## 役割分担

| 担当 | 役割 |
| --- | --- |
| ユーザー | 最終的な意思決定、MRの承認とmerge、秘密値の管理（Vercel、Neon等）、`/codex:review`・`/codex:adversarial-review`の実行 |
| Claude Code | ロードマップの解釈、設計判断、タスク指示書の作成、Codexへの依頼、差分レビュー、検証コマンドと画面確認の実行、ドキュメント更新、完了判定 |
| Codex | タスク指示書の範囲内での実装、バグ修正、原因調査、検証結果の報告 |

Claude CodeからCodexへの依頼は、codexプラグインの `codex:codex-rescue` サブエージェントを通じて行います。

## 開発ループ（1タスク = 1MR）

```mermaid
flowchart LR
  A[指示書作成<br/>Claude] --> B[実装<br/>Codex]
  B --> C[独立検証<br/>Claude]
  C -- 問題あり --> D[修正依頼<br/>Codex resume]
  D --> C
  C -- OK --> E[クロスレビュー<br/>/codex:review]
  E --> F[MR作成<br/>Claude]
  F --> G[merge<br/>ユーザー]
```

1. **指示書作成（Claude）**: 下記テンプレートでタスク指示書を作成する。1MRで完了できない大きさであれば分割する。
2. **実装（Codex）**: 指示書を渡して実装を依頼する。
3. **独立検証（Claude）**: `git diff` をレビューし、検証コマンドを自分で実行する。画面に影響する変更は、ブラウザでADMIN、MANAGER、MEMBERの3ロールで確認する。Codexの報告だけで完了と判定しない。
4. **修正（Codex）**: 問題があれば、同じCodexスレッドを再開して修正を依頼する。
5. **クロスレビュー**: ユーザーが `/codex:review` を実行する。設計に関わる大きな変更では `/codex:adversarial-review` を実行する。Claudeが指摘事項を対応要否で仕分ける。
6. **MR作成（Claude）**: `git pull --rebase` の後にpushし、日本語でMRを作成する。mergeはユーザーが行う。

## タスク指示書テンプレート

```markdown
# タスク: <短い名前>

## 背景・目的
<なぜ必要か。関連するPhaseと完了条件>

## 対象範囲
- 変更してよいファイル・モジュール: <例: src/modules/members/>
- 参照すべきドキュメント: <例: docs/CSV_PERMISSION_AUDIT.md の「RBAC」節>

## 仕様
<期待する振る舞い。入力、出力、権限、エラー時の挙動>

## 受け入れ条件
- [ ] <観測可能な条件1>
- [ ] <観測可能な条件2>

## 禁止事項
- 対象範囲外のリファクタリング、依存パッケージの追加、デザイン変更
- DB migration: <要 / 不要>

## 検証コマンド
- npm.cmd run verify -- --skip=test,build,migrate（Codexのサンドボックス内で実行できる範囲）
- test、build、migrationの検証はClaudeが実行する

## 報告してほしいこと
変更ファイル、実行したコマンドと結果（失敗も含む）、未対応事項、判断に迷った点
```

## 完了の定義（Definition of Done）

- タスク指示書の受け入れ条件をすべて満たしている。
- `npm.cmd run verify` がClaudeの手元で成功している。schemaを変更しない場合は `-- --skip=migrate` を指定してよい。
- 振る舞いを変えた業務ロジックにユニットテストがある。
- 画面に影響する変更は、3ロールでの画面確認結果がMRに記載されている。
- API仕様を変えた場合は `docs/api/openapi.yaml` を更新している。
- 設計判断や運用ルールの変更は、関連ドキュメントに反映されている。
- MRのCIパイプラインが成功している。

## Codex実行環境の制約（Windows）

Codexは `workspace-write` サンドボックス（`[windows] sandbox = "unelevated"`、`[sandbox_workspace_write] network_access = true`）で動作する。この環境では子プロセスの起動が拒否される（`spawn EPERM`）ため、Codexが実行できる検証には制限がある。

| 検証 | Codex | 理由 |
| --- | --- | --- |
| typecheck、lint | 実行できる | Prismaのエンジン取得に必要なネットワークを許可済み |
| test | 実行できない | ViteがWindowsのパス解決時に `net use` を起動するため |
| build、migration check | 実行できない | Next.jsのビルドワーカーやPrisma CLIを子プロセスとして起動するため |

権限を最大にする `danger-full-access` は使わず、test、build、migrationの検証はClaudeとCIが担う。
