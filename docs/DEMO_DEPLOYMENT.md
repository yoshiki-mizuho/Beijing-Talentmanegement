# Vercel + Neon デモ環境運用手順

## 位置付け

この環境はPhase 4完了後の限定共有デモです。操作データは永続保持しますが、実在人物の個人情報、顧客情報、機密情報は登録しません。Phase 7で予定するDocker + Kubernetes本番構成とは別環境です。

個人プロジェクトとしてVercel Hobbyプランで運用します。社内利用の可能性が出た場合は、社内サーバへデプロイします。

## リポジトリ構成

- 開発の正はGitLab（`chosen-ryoiki-group/beijing/talentmanagement`）。Issue、MR、CIはすべてGitLabで行う。
- GitLabグループのPrivateリポジトリはVercel Hobbyから接続できないため、個人のGitHub Privateリポジトリ（`yoshiki-mizuho/Beijing-Talentmanegement`）へミラーし、VercelはGitHubに接続する。
- ミラーはGitLabのpush mirrorで自動同期し、protected branch（`main`）だけを対象にする。作業ブランチはGitHubへ送らない。
- ローカルの`origin`はGitLabだけに設定し、GitHubへ直接pushしない。

## 初回構築

1. Neonでデモ専用project、database、roleを作成し、主な利用者に近いリージョンを選ぶ。
2. Neonの接続画面からpool接続文字列とdirect接続文字列を取得する。秘密値はリポジトリ、Issue、MRへ記載しない。
3. GitHubのミラー先リポジトリがPrivateであることを確認する。GitLabの **Settings → Repository → Mirroring repositories** で次のpush mirrorを設定する。
   - Git repository URL: `https://github.com/yoshiki-mizuho/Beijing-Talentmanegement.git`
   - Mirror direction: Push
   - Authentication: Username / Password。usernameにはGitHubのユーザー名を、passwordにはGitHubのfine-grained personal access tokenを指定する。tokenの対象はミラー先リポジトリだけにし、権限はContentsのRead and writeだけを付ける。有効期限を設定し、期限切れになる前に更新する。
   - Mirror only protected branches: 有効
   - 設定後に **Update now** を実行し、GitHubの`main`がGitLabの`main`と同じcommitになることを確認する。
4. GitHubのミラー先リポジトリをVercelへImportし、Framework PresetをNext.js、Production Branchを`main`にする。
5. VercelのProductionだけに次の環境変数を登録する。PreviewとDevelopmentには登録しない。

| 変数 | 設定値 |
| --- | --- |
| `DATABASE_URL` | Neonのpool接続文字列（host名に`-pooler`を含む） |
| `AUTH_SECRET` | デモ環境専用に生成した長いランダム値 |
| `AUTH_URL` | Vercelで確定したProduction URL |
| `AUTH_TRUST_HOST` | `true` |

6. GitLabの **Settings → CI/CD → Variables** に次の変数を登録する。

| 変数 | 設定値 | 属性 |
| --- | --- | --- |
| `NEON_DIRECT_URL` | Neonのdirect接続文字列からクエリ文字列（`?`以降）を除いた値 | Protected、Masked |
| `DEMO_ADMIN_PASSWORD` | デモ管理者のパスワード | Protected、Masked |
| `DEMO_MANAGER_PASSWORD` | デモマネージャーのパスワード | Protected、Masked |
| `DEMO_MEMBER_PASSWORD` | デモメンバーのパスワード | Protected、Masked |

各パスワードは12文字以上かつ相互に異なる値にする。GitLabのMasked変数に使えない文字（`?`、`&`、`=`、空白など）が含まれるとMaskedにできないため、マスクを外すのではなく値を見直す。`sslmode=require`等の接続オプションはジョブ内で付与する。パスワードに`$`を含める場合は、変数の **Expand variable reference** を無効にする。

7. VercelのPreview環境でBranch Trackingを無効化する。`vercel.json`でも`"**": false`と`"main": true`により`main`以外を無効化していることを確認する。`"main": true`だけでは、指定していないブランチは有効のままになる。また`*`は`/`を含むブランチ名（`feature/xxx`等）に一致しないため`**`を使う。Previewには`DATABASE_URL`を登録しないため、Previewがビルドされると`prisma generate`が`PrismaConfigEnvError`で失敗する。
8. 社内ネットワークではPostgreSQLプロトコル（5432番）が遮断されるため、migrationとseedはGitLab CIの手動起動専用ジョブで実行する。GitLabの **Build → Pipelines → Run pipeline** を開き、branchに`main`、変数`DEMO_DB_TASK`に`migrate`または`migrate_and_seed`を指定してパイプラインを実行する。初回構築では`migrate_and_seed`を指定し、`demo_db_migrate`に続いて`demo_db_seed`が実行される。

seedにより各機能を確認するための架空の部署、スキル、ロール、メンバー、申告、通知が投入される。再実行しても既存のデモデータやユーザーのパスワードは上書きせず、TM0003に申告が1件でもあれば申告と通知は追加しない。既存環境でレベル変更履歴がmigrationによる埋め戻しだけのデモメンバーは、定義済みスキルの埋め戻し履歴をデモ用の成長履歴へ置き換える。承認・直接編集による履歴があるメンバーには触れない。認証情報は限定された共有経路で利用者へ渡す。

社外ネットワークなど5432番が利用できる環境では、代替手順として作業端末からdirect接続してもよい。

```powershell
$env:DATABASE_URL = "<Neon direct connection string>"
$env:DEMO_ADMIN_PASSWORD = "<private strong password>"
$env:DEMO_MANAGER_PASSWORD = "<private strong password>"
$env:DEMO_MEMBER_PASSWORD = "<private strong password>"
npm exec prisma migrate deploy
npm run db:seed
Remove-Item Env:DATABASE_URL, Env:DEMO_ADMIN_PASSWORD, Env:DEMO_MANAGER_PASSWORD, Env:DEMO_MEMBER_PASSWORD
```

## リリース手順

1. MRで`lint`、`typecheck`、`test`、`build`、migration checkが成功していることを確認する。
2. schema変更がある場合、Neonの復元ポイントまたは論理バックアップを確保する。
3. レビュー済みMRを`main`へマージする。schema変更がある場合は、GitLabの **Build → Pipelines → Run pipeline** でbranchに`main`、変数`DEMO_DB_TASK`に`migrate`を指定してパイプラインを実行し、`demo_db_migrate`の成功を確認する。Vercel buildからmigrationやseedは実行しない。migrationはmerge後に実行するため、Vercelのデプロイとmigrationの間に新しいコードと古いschemaが並ぶ時間が生じる。schema変更は列やテーブルの追加など、旧schemaでも新コードが壊れない形にし、削除や型変更は別リリースに分ける。
4. GitLabのpush mirrorでGitHubの`main`が更新され、Vercel Productionの自動デプロイが完了したことを確認する。同期されない場合は、GitLabのMirroring repositoriesでエラーとtokenの期限を確認し、**Update now** を実行する。
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
