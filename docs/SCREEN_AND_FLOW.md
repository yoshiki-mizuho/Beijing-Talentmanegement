# 画面一覧とユーザーフロー

## 目的

このドキュメントは、初期リリースの画面一覧と主要ユーザーフローを整理します。

フローはGitLab Markdownで閲覧できるように、標準的なMermaid記法で記述します。

## 画面一覧

| 画面 | パス案 | 主な利用者 | 初期リリース | 概要 |
| --- | --- | --- | --- | --- |
| ログイン | `/login` | 全ロール | 含める | Auth.jsによるログイン導線 |
| ダッシュボード | `/dashboard` | 全ロール | 含める | メンバー数、スキル数、未設定、ロール達成状況 |
| 通知一覧 | `/notifications` | 全ロール | 含める | 承認依頼、承認結果、差し戻しの確認 |
| メンバー一覧 | `/members` | 全ロール | 含める | 検索、部署フィルタ、スキル条件検索 |
| メンバー詳細 | `/members/[id]` | 全ロール | 含める | 基本情報、保有スキル、ロール達成状況 |
| メンバー編集 | `/members/[id]/edit` | `admin`、`manager` | 含める | 基本情報と所属の編集 |
| 自分のスキル申告 | `/my/skills` | `member`、`manager`、`admin` | 含める | 自身のスキル、レベル、経験年数の申告 |
| スキル承認 | `/skill-approvals` | `manager`、`admin` | 含める | 申告スキルの承認、補正承認、差し戻し |
| スキル管理 | `/skills` | `admin`、`manager`、`member` | 含める | スキル一覧、カテゴリ、レベル説明 |
| スキル編集 | `/skills/[id]/edit` | `admin` | 含める | スキル定義の作成、更新、無効化 |
| ロール管理 | `/roles` | 全ロール | 含める | ロール一覧、必要スキル、達成判定 |
| ロール編集 | `/roles/[id]/edit` | `admin` | 含める | ロールと必要スキル条件の編集 |
| スキルマップ | `/skill-map` | 全ロール | 含める | メンバー x スキルのマトリクス |
| CSV管理 | `/csv` | `admin`、`manager` | 含める | import/export、プレビュー、差分確認 |
| 監査ログ | `/audit-logs` | `admin` | 含める | 操作履歴の検索、確認 |
| AI評価 | `/ai-evaluation` | 未定 | 後続 | Phase 6で再設計 |

## 画面構成

初期リリースの主要画面は、認証後のアプリケーション領域に配置します。AI評価は初期ナビゲーションに置きません。

```mermaid
flowchart TD
  Login[ログイン] --> App[認証後レイアウト]
  App --> Dashboard[ダッシュボード]
  App --> Notifications[通知一覧]
  App --> Members[メンバー一覧]
  Members --> MemberDetail[メンバー詳細]
  MemberDetail --> MemberEdit[メンバー編集]
  App --> MySkills[自分のスキル申告]
  App --> SkillApprovals[スキル承認]
  App --> Skills[スキル管理]
  Skills --> SkillEdit[スキル編集]
  App --> Roles[ロール管理]
  Roles --> RoleEdit[ロール編集]
  App --> SkillMap[スキルマップ]
  App --> Csv[CSV管理]
  App --> Audit[監査ログ]
  Ai[AI評価 Phase 6] -. 後続 .-> MemberDetail
```

## `admin` ユーザーフロー

`admin` は初期データ整備、マスタ管理、CSV import、監査ログ確認を担当します。

```mermaid
flowchart TD
  Start[ログイン] --> Dashboard[ダッシュボード確認]
  Dashboard --> Master{作業対象を選択}
  Master --> Members[メンバーを登録/更新]
  Master --> Skills[スキルを登録/更新]
  Master --> Roles[ロールを登録/更新]
  Master --> Csv[CSV import/export]
  Members --> Audit[監査ログ記録]
  Skills --> Audit
  Roles --> Audit
  Csv --> Preview[検証結果と差分を確認]
  Preview --> Apply{登録する}
  Apply -->|yes| Commit[一括登録]
  Apply -->|no| Csv
  Commit --> Audit
  Audit --> Done[完了]
```

## `manager` ユーザーフロー

`manager` は担当範囲のメンバー確認、スキル申告の承認・補正、検索、可視化を主に利用します。

```mermaid
flowchart TD
  Start[ログイン] --> Dashboard[担当範囲のサマリー確認]
  Dashboard --> ApprovalRoute[承認依頼対応]
  Dashboard --> MemberRoute[メンバー確認]
  Dashboard --> MapRoute[スキルマップ確認]

  ApprovalRoute --> Notifications[承認依頼通知を確認]
  Notifications --> Approvals[スキル申告一覧]
  Approvals --> Review[申告内容を確認]
  Review --> Decision{承認判断}
  Decision -->|承認| Approve[承認して保有スキルへ反映]
  Decision -->|補正| Correct[レベル/経験年数を補正して承認]
  Decision -->|差し戻し| Reject[コメント付きで差し戻し]
  Approve --> Audit[監査ログ記録]
  Correct --> Audit
  Reject --> Audit
  Audit --> Notify[申告者へ通知]

  MemberRoute --> Members[メンバー一覧]
  Members --> Filter[部署/スキル/レベルで絞り込み]
  Filter --> Detail[メンバー詳細]
  Detail --> RoleCheck[ロール達成状況を確認]

  MapRoute --> SkillMap[スキルマップ確認]

  Notify --> Done[完了]
  RoleCheck --> Done
  SkillMap --> Done
```

## `member` ユーザーフロー

`member` は自分のスキル申告を行い、承認状況や承認済みスキルを確認します。マスタ更新、CSV import、監査ログ閲覧は行えません。

```mermaid
flowchart TD
  Start[ログイン] --> Dashboard[自分のサマリー確認]
  Dashboard --> MySkills[自分のスキル一覧]
  MySkills --> Submit[スキル/レベル/経験年数を申告]
  Submit --> NotifyManager[managerへ承認依頼通知]
  NotifyManager --> Wait[承認待ち]
  Wait --> Result{承認結果}
  Result -->|承認| Approved[承認済みスキルへ反映]
  Result -->|補正承認| Corrected[補正内容を確認]
  Result -->|差し戻し| Revise[コメントを確認して再申告]
  Approved --> Roles[自分のロール達成状況確認]
  Corrected --> Roles
  Revise --> Submit
  Roles --> Done[完了]
```

## スキル申告・承認シーケンス

メンバースキルは、原則としてメンバー自身の申告を起点にし、managerが承認または補正承認した時点で承認済みスキルへ反映します。

```mermaid
sequenceDiagram
  actor Member
  actor Manager
  participant UI as Skill UI
  participant Auth as auth module
  participant Members as members use case
  participant Skills as skills module
  participant Notifications as notifications module
  participant Audit as audit module

  Member->>UI: スキル申告を送信
  UI->>Auth: 操作可否を確認
  Auth-->>UI: 許可/拒否
  UI->>Members: スキル申告を作成
  Members->>Skills: スキルとレベル定義を確認
  Skills-->>Members: 有効なスキル/レベル
  Members->>Members: 申告内容を検証して承認待ち保存
  Members->>Notifications: managerへ承認依頼を通知
  Members-->>UI: 申告受付結果を返す
  Manager->>UI: 承認待ち申告を確認
  UI->>Members: 承認/補正承認/差し戻しを依頼
  Members->>Members: 承認済みスキルへ反映または差し戻し
  Members->>Audit: 承認判断と変更差分を記録
  Members->>Notifications: memberへ結果を通知
  UI-->>Manager: 処理結果を表示
```

## 初期リリースに含めない画面

| 画面 | 理由 | 後続Phase |
| --- | --- | --- |
| AI評価一覧 | AI評価を初期リリースから外すため | Phase 6 |
| AI再評価操作 | APIキー保護、キャッシュ、利用ログと一体で再設計するため | Phase 6 |
| CSV承認画面 | 初期はプレビューと差分確認までにするため | Phase 5以降で再検討 |
| 外部連携設定 | 初期リリースでは外部人事システム連携を扱わないため | 未定 |
