# AGENTS.md

## 目的

このファイルは、Codexがこのリポジトリで作業する際の最小ガイドです。

詳細な方針は `docs/` 配下を正とし、このファイルでは作業前に確認することだけをまとめます。

## 作業前に確認すること

- まず `docs/ROADMAP.md` で対象フェーズ、主なタスク、完了条件を確認する。
- 技術判断が必要な場合は `docs/TECH_STACK.md` を確認する。
- モジュール境界や依存方向を判断する場合は `docs/ARCHITECTURE.md` を確認する。
- ドメインモデル、初期リリース範囲、主要ユースケースを判断する場合は `docs/DOMAIN_DESIGN.md` を確認する。
- 画面一覧、ユーザーフロー、Mermaid図の方針を判断する場合は `docs/SCREEN_AND_FLOW.md` を確認する。
- 権限、CSV import/export、監査ログ、通知まわりを判断する場合は `docs/CSV_PERMISSION_AUDIT.md` を確認する。
- GitLab運用、branch、MR、review方針は `docs/DEVELOPMENT_WORKFLOW.md` を確認する。
- MVPからの継承・再設計方針は `docs/MVP_REVIEW.md` を確認する。

## Codex作業ルール

- 作業前に、対象フェーズの完了条件を具体的なチェック項目として整理する。
- 完了判断は、ファイル・コマンド結果・レビュー記録などの現在状態を根拠に行う。
- 不足や矛盾を見つけた場合は、関連ドキュメントも更新対象に含める。
- 変更は小さくまとめ、Merge Requestでレビューしやすい単位にする。
- pushまたはMerge Request作成前に `git pull --rebase` を実行し、最新のremote変更を取り込んでからpushする。
- Merge Requestのタイトル、説明、レビュー依頼内容は日本語で記載する。
- ユーザーから指定がない限り、既存方針を優先し、新しいルールを増やしすぎない。

## 現在の状態

- Phase0は完了済み。
- Phase1は完了済み。
- 次の主対象はPhase2。
