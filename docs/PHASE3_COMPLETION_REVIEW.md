# Phase 3 完了レビュー

## レビュー対象

- `src/app/(app)/members/page.tsx`
- `src/app/(app)/my/skills/page.tsx`
- `src/app/(app)/skill-approvals/page.tsx`
- `src/app/(app)/notifications/page.tsx`
- `src/app/(app)/skills/page.tsx`
- `src/app/(app)/roles/page.tsx`
- `src/app/(app)/account/password/page.tsx`
- `src/app/api/`
- `src/modules/members/`
- `src/modules/skills/`
- `src/modules/roles/`
- `src/modules/notifications/`
- `docs/api/openapi.yaml`

## 判定

Phase 3の完了条件は満たしています。

## 完了条件ごとの確認

| 完了条件 | 判定 | 根拠 |
| --- | --- | --- |
| メンバー、スキル、ロールを登録、更新、削除、参照できる | OK | `/members`、`/skills`、`/roles` で登録、更新、無効化、一覧参照を実装。メンバー登録時はログイン用Userと初期パスワードを作成。メールは正規化し、既に別メンバーへ紐付いたUserの再利用は拒否。カテゴリは編集と空カテゴリ削除に対応。スキルコードは自動採番 |
| メンバーが自分のスキルとレベルを申告できる | OK | `/my/skills` と `createSkillAssessmentAction` でログイン中メンバーのスキル、レベル、経験年数の申告を実装 |
| managerが申告内容を承認、補正承認、差し戻しできる | OK | `/skill-approvals` と `reviewSkillAssessmentAction` で `APPROVED`、`CORRECTED`、`REJECTED` を処理。承認/補正承認時は `MemberSkill` へ反映 |
| 承認依頼と承認結果が通知される | OK | 申告作成時に `ADMIN` / `MANAGER` のメンバーへ承認依頼通知を作成。レビュー時に申告者へ承認結果通知を作成。`/notifications` で一覧と既読化を実装 |
| ロール要件に基づいて達成状況を判定できる | OK | `evaluateRoleAchievement` で達成可否、達成率、充足要件、不足要件を算出し、`/roles` でメンバーごとの達成状況を表示 |
| Phase3で実装する主要業務APIのOpenAPI仕様が残っている | OK | `docs/api/openapi.yaml` にメンバー、スキル、カテゴリ、ロール、ロール要件、スキル申告、承認、通知、パスワード変更の主要API契約を追加 |
| 主要な業務ロジックにユニットテストがある | OK | ロール達成判定、メンバー入力、スキル入力、スキルコード採番、ロール入力、スキル申告/承認入力、パスワード変更入力のユニットテストを追加 |

## Phase 3で追加したこと

- Phase2で定義済みのPrisma modelを基礎に、初回パスワード変更状態を管理する `User.passwordChangeRequired` migrationを追加した。
- `members`、`skills`、`roles`、`notifications` に application、domain、infrastructure、presentation の実装を追加した。
- 画面更新はServer Actions、業務APIはRoute Handlersとして実装し、どちらもapplication serviceを経由する構成にした。
- Route Handlersは認証済みセッションを要求し、入力検証はapplication service内のZod schemaへ集約した。
- メンバー、スキル、ロールの削除操作は物理削除ではなく無効化として実装した。
- メンバー登録時にログイン用Userを作成し、初期パスワード `password` と初回変更必須状態を設定するようにした。
- メンバー登録時のメールアドレスをログイン処理と同じ小文字へ正規化し、既存Userが別メンバーへ紐付いている場合は再利用しないようにした。
- 初期パスワード状態のユーザーは `/account/password` へ強制誘導し、変更完了まで業務機能を利用できないようにした。
- 初期パスワード状態のユーザーは、画面遷移だけでなくServer Action/APIの業務更新も拒否するようにした。
- スキルカテゴリは編集と配下0件時の削除に対応し、スキルコードは `SKILL-0001` 形式で自動採番するようにした。
- ロール要件は必須要件のみとし、既存要件の必要レベルを直接編集できるようにした。
- スキルレベルは1から5の整数に制限した。
- スキル申告フローでは、申告作成、承認者通知、承認/補正承認/差し戻し、承認済みスキル反映、申告者通知までを実装した。
- ロール達成判定は単純な真偽値だけでなく、達成率と不足要件を返すように拡張した。

## 確認コマンド

| コマンド | 結果 |
| --- | --- |
| `npm.cmd run typecheck` | OK |
| `npm.cmd run test` | OK。9 files / 29 tests passed |
| `npm.cmd run lint` | OK |
| `npm.cmd run build` | OK |
| `npm.cmd run prisma:migrate:check` | 未完了。`prisma validate` はOK。ローカルPostgreSQL未起動、かつDocker Desktop APIエラーでDBを起動できずdiff確認は未実行 |
| `npm.cmd run db:seed` | 未実行。DB接続不可のため |
| `git diff --check` | OK |

## Phase 4以降へ回すもの

- メンバー検索、スキル検索、部署フィルタ、スキルマップ、ダッシュボード集計の本実装。
- TanStack Table / TanStack Queryの必要箇所への導入。
- CSV import/export、監査ログ記録、RBACの画面/API適用。
- AI評価、キャッシュ、再評価、利用ログ、フォールバック。
- 主要業務フローのE2Eテストとブラウザ操作レベルの回帰確認。

## 注意点

- Phase3では最小限の権限制御として、admin/manager/memberのサーバー側操作ガードを実装しています。部署や担当範囲などの詳細RBACはPhase5で扱います。
- 監査ログの実記録はPhase5で扱います。
- 通知はDB内通知として実装し、メールや外部通知連携は含めていません。
- OpenAPI仕様はPhase3時点の主要業務API契約です。CIでのOpenAPI lint/validate導入は後続のCI強化時に扱います。
