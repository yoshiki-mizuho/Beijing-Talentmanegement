# ローカル開発環境

## 方針

- 日常の開発、Codexによる実装、テストは、WindowsにネイティブでインストールしたPostgreSQL 17を使う。
- Docker Desktopは、メモリ8GB級の端末ではLinux VMのメモリ不足でクラッシュしやすいため、日常の開発では必須にしない。`docker-compose.yml` は、余裕のある環境とCIでの検証用に残す。
- Dockerイメージのビルド確認とKubernetes構成の検証は、GitLab CIで行う。
- 複数人で確認する場合や、ローカルにPostgreSQLを用意できない端末では、Neonのブランチを個別に作成して使う。複数人で同じDBを共有して開発しない。

## 初回セットアップ（Windows）

1. PostgreSQL 17をインストールする（例: `winget install PostgreSQL.PostgreSQL.17`）。サービス `postgresql-x64-17` が起動していることを確認する。
2. `postgres` ユーザーで、アプリ用のroleとdatabaseを作成する。値は `.env.example` と同じローカル専用の値にする。

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE talent WITH LOGIN PASSWORD 'talent_password' CREATEDB;" -c "CREATE DATABASE talentmanagement OWNER talent;"
```

`CREATEDB` は、Prismaのmigration差分確認でshadow databaseを作るために必要。

3. `.env.example` を `.env` にコピーする。
4. 依存関係をインストールし、migrationとseedを実行する。seedのパスワードはローカル専用の値を指定し、コミットしない。

```powershell
npm.cmd ci
npm.cmd exec -- prisma migrate deploy
$env:DEMO_ADMIN_PASSWORD = "<12文字以上のローカル用の値>"
$env:DEMO_MANAGER_PASSWORD = "<別の値>"
$env:DEMO_MEMBER_PASSWORD = "<別の値>"
npm.cmd run db:seed
Remove-Item Env:DEMO_ADMIN_PASSWORD, Env:DEMO_MANAGER_PASSWORD, Env:DEMO_MEMBER_PASSWORD
```

5. `npm.cmd run dev` で起動し、`http://localhost:3000/login` から `admin@example.com`、`manager@example.com`、`member@example.com` でログインする。

## 検証コマンド

基本の品質ゲートは、以下の集約コマンドで順番に実行する。

```powershell
npm.cmd run verify
```

一部の手順を省略する場合は、`npm.cmd run verify -- --skip=build,migrate` のように手順名をカンマ区切りで指定する。手順名は `typecheck`、`lint`、`test`、`build`、`migrate` である。各手順は `npm.cmd run typecheck` などの個別コマンドでも引き続き実行できる。

## DBを作り直す

DBの状態が壊れた場合は、`npm.cmd exec -- prisma migrate reset` で作り直してからseedを再実行する。ローカルDBの中身は使い捨てとして扱い、共有したいデータはseedに反映する。
