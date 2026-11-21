# ローカル開発環境

## 方針

- 日常の開発、Codexによる実装、テストは、WindowsにネイティブでインストールしたPostgreSQL 17を使う。
- Docker Desktopは、メモリ8GB級の端末ではLinux VMのメモリ不足でクラッシュしやすいため、日常の開発では必須にしない。`docker-compose.yml` は、hub-devkit（開発用の入口と偽の基盤）とともに動かす余裕のある環境向け（下の「hub-devkit で動かす」）。
- Dockerイメージのビルド確認とKubernetes構成の検証は、GitLab CIで行う。
- 複数人で確認する場合や、ローカルにPostgreSQLを用意できない端末では、Neonのブランチを個別に作成して使う。複数人で同じDBを共有して開発しない。

## 初回セットアップ（Windows）

1. PostgreSQL 17をインストールする（例: `winget install PostgreSQL.PostgreSQL.17`）。サービス `postgresql-x64-17` が起動していることを確認する。
2. `postgres` ユーザーで、migration 用の role と database を作成する。次に、RLS が効くアプリ用 role `talent_app` を作る SQL を1回だけ流す（テーブルへの権限は、手順 4 の migration の後に `grant-local-app-role.sql` で付ける）。パスワードはファイルへ書かず、`app_password` 変数で渡す。

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE talent WITH LOGIN PASSWORD 'talent_password' CREATEDB;" -c "CREATE DATABASE talentmanagement OWNER talent;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -d talentmanagement -v app_password="ローカル用のアプリパスワード" -f prisma/sql/create-local-app-role.sql
```

`CREATEDB` は、Prismaのmigration差分確認でshadow databaseを作るために必要。

3. `.env.example` を `.env` にコピーする。`DATABASE_URL` は `talent_app` のアプリ用 URL、`MIGRATE_DATABASE_URL` は `talent` の migration 用 URL にする。`.env` はGit管理外であり、コミットしない。

AIを通信なしで確認する場合は、`.env`の`AI_API_BASE_URL`を`fake`にする。

OpenAI互換APIを使う場合は、`AI_API_BASE_URL`、`AI_API_KEY`、`AI_MODEL`を設定する。

必要に応じて`AI_TIMEOUT_MS`へミリ秒単位の上限を設定する。

`AI_MONTHLY_TOKEN_LIMIT`へ正の整数を設定すると、日本時間の暦月ごとにトークン数を制限できる。

未設定の場合は上限なしになる。

APIキーはサーバー専用であり、`NEXT_PUBLIC_`を付けない。

4. 依存関係をインストールし、migrationとseedを実行する。

seedは`localhost`、`127.0.0.1`、`postgres`への接続ではそのまま実行でき、その他の接続先では`ALLOW_DEMO_SEED=true`の明示が必要になる。

```powershell
npm.cmd ci
npm.cmd exec -- prisma migrate deploy
npm.cmd exec -- prisma db execute --file prisma/sql/grant-local-app-role.sql
npm.cmd run db:seed
```

`prisma.config.ts` は `MIGRATE_DATABASE_URL` を優先する。クラスタの migrate ジョブは移行用の値を `DATABASE_URL` として受け取るため、`MIGRATE_DATABASE_URL` が無い場合は `DATABASE_URL` を使う。seed、アプリ、E2E は `DATABASE_URL` の `talent_app` で動かす。

5. 画面は基盤の入口（hub-devkit）を通して開く。seed の利用者は、管理者 `22222222-2222-4222-8222-222222222222`、マネージャー `22222222-2222-4222-8222-000000000004`、メンバー `22222222-2222-4222-8222-000000000005`（テナント `11111111-1111-4111-8111-111111111111`）。

## 検証コマンド

基本の品質ゲートは、以下の集約コマンドで順番に実行する。

```powershell
npm.cmd run verify
```

一部の手順を省略する場合は、`npm.cmd run verify -- --skip=build,migrate` のように手順名をカンマ区切りで指定する。手順名は `typecheck`、`lint`、`test`、`build`、`migrate` である。各手順は `npm.cmd run typecheck` などの個別コマンドでも引き続き実行できる。

RLS の DB 専用テストは migration 後に `npm.cmd run test:db` で実行する。通常の `npm.cmd run test` には含まれない。

## E2Eテスト

初回のみ、Playwrightが使用するChromiumをインストールする。

```powershell
npx playwright install chromium
```

E2Eテストは本番ビルドを起動し、基盤の入口を通さず `X-Auth-*` ヘッダを付けて直接実行する。
Playwright は `npm.cmd run platform:fake` で TalentHub 所有の偽の社員・組織基盤も起動し、アプリへ `PLATFORM_USER_ORG_GRPC_ADDR=127.0.0.1:50051` を渡す。操作用 HTTP は `127.0.0.1:50052` で、`POST /__fake/users`、`POST /__fake/nodes`、`POST /__fake/reset`、遅延確認用の `POST /__fake/delay` を E2E からだけ使う。

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

偽の基盤だけを手元で起動するときは `npm.cmd run platform:fake` を使う。停止は起動した端末で `Ctrl+C`。既定データは hub-devkit と同じ `local-dev` 9 人、`no-hub` 2 人と組織の木である。

E2Eテストはスキル申告と承認を行い、ローカルDBのデータを変更する。共有DBでは実行せず、使い捨て可能なローカルDBを使用する。

E2Eテストは専用のデータを作成し、終了時に削除する。共用のデモアカウントとデモデータは、seedの内容や権限制御などを見るだけのテストでのみ使用し、書き込みは行わない。

ローカルでのE2Eテスト終了時には、テストや画面確認が作成したデータを自動で掃除する。CIでは自動掃除を行わない。手動で掃除する場合は、まず削除候補の件数だけを確認し、問題がなければ `--yes` を付けて実行する。

```powershell
npm.cmd run db:cleanup-e2e
npm.cmd run db:cleanup-e2e -- --yes
```

掃除コマンドは接続先のホスト名が `localhost`、`127.0.0.1`、`::1`、`postgres` のいずれかでなければ削除しない。seedで作成したデモアカウントとデモメンバーも削除対象から除外する。デモアカウントに関連付いた申告や履歴まで消したい場合は、このコマンドではなくローカルDBを作り直す。

## 画面確認

`npm.cmd run ui:check` は E2E と同じ `X-Auth-*` ヘッダで3ロールの主要画面を撮影する。`$env:UI_CHECK_ONLY = "MANAGER"` のように指定すると対象ロールを絞れる。撮影の台本は `e2e/ui-check/screens.spec.ts`。スクリーンショットは `test-results/ui-check/` に保存され、Git管理には含まれない。

## DBを作り直す

DBの状態が壊れた場合は、`MIGRATE_DATABASE_URL` に migration 用 URL が設定されていることを確認し、`npm.cmd exec -- prisma migrate reset` で作り直す。reset はスキーマを作り直して `talent_app` の権限が消えるので、`npm.cmd exec -- prisma db execute --file prisma/sql/grant-local-app-role.sql` で権限を付け直してから、seedを再実行する。ローカルDBの中身は使い捨てとして扱い、共有したいデータはseedに反映する。

## hub-devkit で動かす

ログインは基盤の入口が行うため、手元では hub-devkit（開発用の入口と偽の基盤）を通して確かめる。手順の全体はスキル `hub-local-check` と `contract/guide.md` の §9。

### Docker を使う場合

`scripts/devkit.sh up` で、devkit の取り込み（`.devkit/`、git に入れない）、ビルド、起動まで行う。設定は `dev/devkit.yaml` と `docker-compose.yml`。ブラウザで `http://localhost:8000/talent` を開く。

### Docker を使わない場合（この PC の既定）

基盤の担当の回答（hub-platform#4）にもとづく。

1. Go 1.23 以上を用意する。
2. 基盤のリポジトリを、契約の版のタグで取り、devkit をビルドする。

   ```bash
   git clone --depth 1 --branch hub-contract/v0.20.0 https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git ../hub-platform
   cd ../hub-platform/devkit && go build -o hub-devkit .
   ```

3. 手元の PostgreSQL と TalentHub（`npm.cmd run dev`、`localhost:3000`）を起動しておく。TalentHub には、偽の基盤の接続先を環境変数で渡す：`PLATFORM_USER_ORG_GRPC_ADDR=localhost:9192`、`PLATFORM_TENANT_GRPC_ADDR=localhost:9195`、`PLATFORM_NOTIFICATION_GRPC_ADDR=localhost:9193`、`PLATFORM_LLM_GRPC_ADDR=localhost:9184`、`HUB_NAME=talenthub`。
4. devkit を起動する。

   ```bash
   DEVKIT_HUB_NAME=talenthub DEVKIT_HUB_PATH_PREFIX=talent DEVKIT_CONFIG=dev/devkit.local.yaml ../hub-platform/devkit/hub-devkit
   ```

5. 入口 `http://localhost:8000/talent` を開き、利用者を選んでログインする。確かめ終わったら devkit と TalentHub を止める（メモリが少ないため）。

devkit は手元の代わり。本物と違う点に頼るコードや、devkit のためだけの分岐をアプリに入れない。
