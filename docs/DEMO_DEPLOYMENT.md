# Vercel + Neon デモ環境運用手順

## 位置付け

この環境はPhase 4完了後の限定共有デモです。操作データは永続保持しますが、実在人物の個人情報、顧客情報、機密情報は登録しません。Phase 7で予定するDocker + Kubernetes本番構成とは別環境です。

## 初回構築

1. Neonでデモ専用project、database、roleを作成し、主な利用者に近いリージョンを選ぶ。
2. Neonの接続画面からpool接続文字列とdirect接続文字列を取得する。秘密値はリポジトリ、Issue、MRへ記載しない。
3. GitLabリポジトリをVercelへImportし、Framework PresetをNext.js、Production Branchを`main`にする。
4. VercelのProductionだけに次の環境変数を登録する。PreviewとDevelopmentには登録しない。

| 変数 | 設定値 |
| --- | --- |
| `DATABASE_URL` | Neonのpool接続文字列（host名に`-pooler`を含む） |
| `AUTH_SECRET` | デモ環境専用に生成した長いランダム値 |
| `AUTH_URL` | Vercelで確定したProduction URL |
| `AUTH_TRUST_HOST` | `true` |

5. VercelのPreview環境でBranch Trackingを無効化する。`vercel.json`でも`main`以外を無効化していることを確認する。
6. 作業端末でdirect接続を一時的に`DATABASE_URL`へ設定し、次を順番に実行する。

```powershell
$env:DATABASE_URL = "<Neon direct connection string>"
$env:DEMO_ADMIN_PASSWORD = "<private strong password>"
$env:DEMO_MANAGER_PASSWORD = "<private strong password>"
$env:DEMO_MEMBER_PASSWORD = "<private strong password>"
npm exec prisma migrate deploy
npm run db:seed
Remove-Item Env:DATABASE_URL, Env:DEMO_ADMIN_PASSWORD, Env:DEMO_MANAGER_PASSWORD, Env:DEMO_MEMBER_PASSWORD
```

各パスワードは12文字以上かつ相互に異なる値にする。seedにより各機能を確認するための架空の部署、スキル、ロール、メンバー、申告、通知が投入される。再実行しても既存のデモデータやユーザーのパスワードは上書きせず、TM0003に申告が1件でもあれば申告と通知は追加しない。認証情報は限定された共有経路で利用者へ渡す。

## リリース手順

1. MRで`lint`、`typecheck`、`test`、`build`、migration checkが成功していることを確認する。
2. schema変更がある場合、Neonの復元ポイントまたは論理バックアップを確保する。
3. direct接続を一時的に`DATABASE_URL`へ設定し、`npm exec prisma migrate deploy`を手動実行する。Vercel buildからmigrationやseedは実行しない。
4. レビュー済みMRを`main`へマージし、Vercel Productionの自動デプロイ完了を確認する。
5. `/login`、dashboard、members、skills、skill-mapを3ロールで確認し、CRUD後に再ログインして変更が保持されることを確認する。
6. Vercel FunctionログでDB接続、認証URL、Prisma初期化エラーがないことを確認する。

## データ保護と復旧

- デモデータは自動リセットしない。破壊的なデモ操作の前にNeonの復元ポイントまたはdirect接続による論理バックアップを確保する。
- 初回公開前に架空レコードで復元を試し、利用中のNeonプランで利用可能な復元時点と保持期間を記録する。
- 誤更新時は書き込みを止め、影響時刻を特定し、Neonのpoint-in-time restoreを優先する。利用できない場合は直近の論理バックアップから別databaseへ復元し、内容確認後に接続先を切り替える。
- 復旧後はログイン、主要一覧、対象CRUD、件数を確認してから共有を再開する。

## 認証情報の更新と公開停止

- デモアカウントのパスワードはアプリのパスワード変更機能で個別に更新し、共有先へ再配布する。seedを再実行しても既存パスワードは変わらない。
- `AUTH_SECRET`を更新した場合はVercelを再デプロイし、既存セッションが無効になったことを確認する。
- 公開停止時はVercel ProjectのGit連携またはProduction Deploymentを停止し、Neon roleのパスワードをrotateする。長期停止時はバックアップ取得後にNeon computeを停止する。

## Production smoke test

- 3ロールでログインできる。
- dashboard、members、skills、skill-mapの表示と検索が成功する。
- 許可されたCRUDが成功し、再ログイン・再デプロイ後も保持される。
- 権限外の画面・API操作が拒否される。
- main以外からVercel Deploymentが作成されず、Previewに秘密値がない。
- Vercelログに接続枯渇、認証URL不一致、Prisma初期化エラーがない。
