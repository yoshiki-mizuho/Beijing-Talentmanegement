# Phase 1 完了レビュー

## レビュー対象

- `docs/DOMAIN_DESIGN.md`
- `docs/SCREEN_AND_FLOW.md`
- `docs/CSV_PERMISSION_AUDIT.md`
- `docs/ROADMAP.md`
- `docs/MVP_REVIEW.md`

## 判定

Phase 1の完了条件は満たしています。

## 完了条件ごとの確認

| 完了条件 | 判定 | 根拠 |
| --- | --- | --- |
| 初期リリースに含める業務範囲が明確になっている | OK | `DOMAIN_DESIGN.md` に初期リリース範囲と対象外を定義 |
| DB設計に進めるだけのドメインモデルがある | OK | `DOMAIN_DESIGN.md` にエンティティ、関連、主要制約、Mermaid ER図を定義 |
| 画面設計に進めるだけの画面一覧がある | OK | `SCREEN_AND_FLOW.md` に画面一覧、パス案、利用者、初期リリース対象を定義 |
| 主要ユーザーフローが整理されている | OK | `SCREEN_AND_FLOW.md` に `admin`、`manager`、`member` のMermaidフローを定義 |
| CSVの基本方針が決まっている | OK | `CSV_PERMISSION_AUDIT.md` に対象、項目、import/export処理を定義 |
| 権限の基本方針が決まっている | OK | `CSV_PERMISSION_AUDIT.md` に `admin`、`manager`、`member` の操作可否を定義 |
| 監査ログの記録対象が決まっている | OK | `CSV_PERMISSION_AUDIT.md` に記録対象、操作、記録内容、保持方針を定義 |
| AI評価の扱いが明文化されている | OK | `DOMAIN_DESIGN.md` と `MVP_REVIEW.md` で初期リリース対象外、Phase 6で再設計と定義 |
| スキル申告と承認フローが明確になっている | OK | `DOMAIN_DESIGN.md` と `SCREEN_AND_FLOW.md` にmember自己申告、manager承認・補正、通知の流れを定義 |

## Phase 1で決定したこと

- 初期リリースは、メンバー、部署、スキル、メンバースキル、ロール、可視化、CSV、権限、監査を対象にする。
- CSV import/exportの初期対象は、部署、メンバー、スキル、メンバースキルに限定する。
- 権限ロールは `admin`、`manager`、`member` の3種類とする。
- スキル紐付けはmemberの自己申告を起点にし、managerが承認、補正承認、差し戻しを行う。
- 承認依頼と承認結果は通知する。
- 重要操作は監査ログへ記録する。
- AI評価は初期リリースに含めず、Phase 6で本番運用前提に再設計する。
- フロー、画面遷移、モジュール関係、CSV処理はMermaidで図示する。

## Phase 2以降へ回すもの

- Prisma schemaとmigration。
- Zod schema、DTO、Server Actions、Route Handlers。
- Auth.jsとRBACの実装。
- CSV import/exportの実装。
- ロール要件CSV import。
- CSV import承認フロー。
- AI評価の実行、キャッシュ、再評価、利用ログ、フォールバック。

## レビュー観点

- 既存の `ARCHITECTURE.md` にあるモジュール境界、依存方向と矛盾しない。
- `ROADMAP.md` のPhase 1完了条件を満たす。
- `MVP_REVIEW.md` のPhase 1で決めるべき項目を具体化している。
- Mermaid記法はGitLab Markdownで扱いやすい標準的な `flowchart`、`sequenceDiagram`、`erDiagram` に留めている。
