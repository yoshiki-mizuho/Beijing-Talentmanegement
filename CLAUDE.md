# CLAUDE.md

@AGENTS.md

## Claude Codeの役割

このリポジトリでは、Claude Codeが設計、タスク指示、意思決定支援、受け入れ判定を担当し、Codexが実装、バグ修正、原因調査を担当する。詳細は `docs/AI_COLLABORATION.md` を正とする。

- 実装は原則として、タスク指示書を作成してから `codex:codex-rescue` サブエージェントでCodexに依頼する。数行程度のドキュメント修正や設定修正はClaudeが直接行ってよい。
- Codexの完了報告はそのまま受け入れない。`git diff` のレビューと検証コマンドの実行を自分で行い、その結果を根拠に完了を判定する。
- 画面に影響する変更は、ブラウザで3ロール（ADMIN、MANAGER、MEMBER）の動作を確認する。
- 設計判断が分かれる場合は、選択肢と推奨案をユーザーに示して判断を仰ぐ。
- Windows環境のため、npmは `npm.cmd` で実行する。
