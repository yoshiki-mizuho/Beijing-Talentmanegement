# Phase 4 完了レビュー

## レビュー対象

- `src/app/(app)/members/page.tsx`
- `src/app/(app)/skills/page.tsx`
- `src/app/(app)/skill-map/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/modules/members/`
- `src/modules/skills/`
- `src/modules/skill-map/`
- `src/modules/dashboard/`
- `docs/api/openapi.yaml`

## 判定

Phase 4の完了条件は、静的検証、実DB接続、認証済み画面アクセスの確認を含めて満たしています。

## 完了条件ごとの確認

| 完了条件 | 判定 | 根拠 |
| --- | --- | --- |
| スキルや部署から対象メンバーを検索できる | OK | `/members` にキーワード、部署、スキル、最低レベル、ロール、在籍状態の検索テーブルを追加。GET `/api/members` も同じqueryに対応 |
| スキルマップで全体傾向を確認できる | OK | `/skill-map` を本実装し、メンバー x スキルのマトリクス、対象数、設定済みセル数、スキル別保有人数と平均レベルを表示 |
| ダッシュボードでメンバー数、スキル数、未設定、ロール保有状況などを確認できる | OK | `/dashboard` をDB集計ベースに置き換え、メンバー数、スキル数、スキル未設定、承認待ち、未読通知、ロール達成状況、カテゴリ別スキル数を表示 |
| 業務利用に耐える一覧・詳細導線がある | OK | メンバー検索、スキル検索、ロール保有状況、スキルマップをTanStack Tableで表示し、既存CRUDフォームへの導線を同一画面に維持 |

## Phase 4で追加したこと

- `@tanstack/react-table` と `@tanstack/react-query` を導入した。
- メンバー検索条件とスキル検索条件のZod schemaを追加した。
- メンバー一覧APIとスキル一覧APIに検索queryを追加し、`docs/api/openapi.yaml` に反映した。
- `dashboard` モジュールにDB集計用のapplication/domain/infrastructure実装を追加した。
- `skill-map` モジュールにマトリクス集計と表示用テーブルを追加した。
- ダッシュボード、スキルマップ、検索条件のユニットテストを追加した。

## デザイン刷新 第1チェックポイント

- 共通レイアウトを全高ナビゲーション、コンパクトヘッダー、レスポンシブなモバイルドロワーへ刷新した。
- 明るいニュートラル背景、チャコール文字、ティールの主操作色と分析用の共通カラートークンを定義した。
- ダッシュボードをKPI、ロール充足率、カテゴリ別スキル構成、要対応領域へ再構成し、既存集計値だけを可視化した。
- 1440px、1024px、390pxで表示を確認し、ADMIN、MANAGER、MEMBERの既存権限と主要画面へのアクセスを再確認した。

## デザイン刷新 第2チェックポイント

- メンバー、スキル、スキルマップを共通UIとレスポンシブテーブルへ刷新した。
- メンバー検索で初期データが15秒間fresh扱いとなり検索APIが実行されない問題を修正し、6条件の単独・複合検索を検証した。
- ADMINは全画面、MANAGERはCSV・監査ログ以外、MEMBERはダッシュボード・自分のスキル・通知だけに画面と一覧APIを制限した。
- MEMBERダッシュボードを本人の承認済みスキル、平均レベル、承認待ち、通知、目標ロールとのギャップ、次の行動に特化した。
- Docker production build、3ロールの全画面アクセス、MEMBERの一覧API 403を確認した。
## 操作性改善 第3チェックポイント

- メンバー一覧の行選択で詳細モーダルを開き、一覧下部にあった基本情報編集と保有スキル管理をモーダルへ統合した。
- 通知の操作を「確認」に統一し、受信者本人の通知であることを再確認して既読化した後、権限に応じてスキル承認または自分のスキル画面へ遷移するようにした。
- 自分のスキル画面で複数スキルを追加し、レベルをスライダーで設定して一括申請できるようにした。申請と管理者通知は同一トランザクションで保存する。
- モーダルのフォーカス制御、通知遷移先、重複申請検証、一括保存のトランザクション境界をユニットテストで確認した。

## 確認コマンド

| コマンド | 結果 |
| --- | --- |
| `npm.cmd run typecheck` | OK |
| `npm.cmd run test -- --maxWorkers=2` | OK。22 files / 77 tests passed |
| `npm.cmd run lint` | OK |
| `npm.cmd run build` | OK |
| `npm.cmd run prisma:migrate:check` | OK。`prisma validate` とmigration差分なしを確認 |
| `npm.cmd run db:seed` | OK。既存DBへ不足migration適用後、seed完了 |
| `docker compose up -d db` | OK。`talentmanagement-db` がhealthy、`localhost:5432` で待受 |
| 認証済みHTTPアクセス | OK。`/dashboard`、`/members`、`/skills`、`/skill-map` がすべて200 |
### Docker Desktop再検証時の環境障害

2026-07-18の再検証では、Docker Desktop 4.82.0が無効化済みKubernetesの旧コンテナ3件を復元した直後にLinux VMが応答不能になっていた。Engineが応答する短時間に`desktop-control-plane`、`kind-registry-mirror`、`kind-cloud-provider`を削除したことで復旧した。BuildKitの停止は、タイムアウト後も残っていた`docker.exe`ビルドプロセスがロックを保持していたことが原因であり、残留プロセスと中間コンテナの除去後に解消した。Engine 29.6.1の継続応答、DBのhealthy化、migration差分なし、seed成功、Composeによるapp・db-initのビルドと起動、Docker版アプリでの認証済み4画面と検索APIの正常応答を再確認した。

## Phase 5以降へ回すもの

- CSV import/export、監査ログ記録、詳細RBAC適用。
- 担当範囲に基づくmanager向け検索結果制限。
- メンバー詳細モーダルにおけるロール達成状況の表示拡張。
- 主要業務フローのE2Eテストとブラウザ操作レベルの回帰確認。
