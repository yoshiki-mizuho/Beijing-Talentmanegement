---
name: local-dev
description: TalentHub（このリポジトリのNext.jsアプリ）をローカルホストで起動し、ブラウザで開発中の画面を確認できる状態にする。PostgreSQLの起動確認、migration、seed、開発サーバーの起動、ログイン用アカウントの案内までを行う。「ローカルで起動して」「画面を確認したい」「localhostで見たい」「開発サーバーを立てて」「デモデータでログインしたい」「ローカルのDBを作り直して」など、手元で画面を動かしたい・確認したい依頼では必ずこのスキルを使うこと。本番ビルドで確認したい場合（「本番ビルドで」「buildして起動」）にも使う。
---

# ローカル起動（TalentHub）

開発中の画面をブラウザで確認できる状態にするための手順。利用者は画面を見て判断したいので、起動できたら URL とログイン方法を短く伝えることがゴール。途中で止まったら、原因と利用者がすべきことを日本語で具体的に伝える。

前提（docs/LOCAL_DEVELOPMENT.md と同じ）:
- Windows。npm は `npm.cmd`、プロジェクトルートで実行する。
- DB は Windows ネイティブの PostgreSQL 17（サービス名 `postgresql-x64-17`、DB `talentmanagement`、ユーザー `talent`）。この PC はメモリが少なく Docker Desktop は使わない。
- 接続先とログイン用パスワードは Git 管理外の `.env` に書かれている。`.env` の中身は秘密値を含むので読み取らない・表示しない。必要な値は seed や Prisma が `dotenv` 経由で自分で読む。

## 手順

### 1. 既に起動していないか確認する

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

200 なら既に起動している。新しく起動せず、そのまま手順 6 の案内をする（二重起動はメモリを圧迫し、ポートも衝突する）。

### 2. PostgreSQL サービスを確認する

```bash
powershell.exe -NoProfile -Command "(Get-Service postgresql-x64-17).Status"
```

`Running` でなければ止まっている。サービスの開始は管理者権限が必要なことがあるので、利用者に「サービス（services.msc）で postgresql-x64-17 を開始してください」と伝えて待つ。

### 3. `.env` の有無を確認する（中身は読まない）

```bash
test -f .env && echo exists || echo missing
```

無ければ利用者に作成を依頼する。`.env.example` をコピーし、`DEMO_ADMIN_PASSWORD` / `DEMO_MANAGER_PASSWORD` / `DEMO_MEMBER_PASSWORD` に 12 文字以上で互いに異なる値を設定してもらう。値はチャットに書かないよう添える。

### 4. migration を適用する

```bash
npm.cmd exec -- prisma migrate deploy
```

未適用の migration があれば適用される（何度実行しても安全）。ブランチを切り替えた直後は schema が変わっていることがあるので毎回実行する。

### 5. seed を投入する

```bash
npm.cmd run db:seed
```

seed は既存データを上書きしないので毎回実行してよい。パスワード未設定のエラー（`DEMO_*_PASSWORD must be at least 12 characters` など）が出たら、手順 3 の `.env` の設定を利用者に依頼する。

### 6. 開発サーバーを起動する

既定は開発モード（コード変更が即座に画面へ反映される）。Bash ツールの `run_in_background: true` で起動し、ログイン画面が応答するまで待つ。

```bash
npm.cmd run dev
```

```bash
until curl -s -o /dev/null http://localhost:3000/login; do sleep 2; done; echo ready
```

利用者が「本番ビルドで」と言った場合だけ、`npm.cmd run build` の後に `npm.cmd run start` をバックグラウンドで起動する（実際のデモに近い動作で確認したいとき。ビルドに約1分かかる）。

起動できたら、次の形で短く案内する。パスワードの値は書かない。

```
起動しました: http://localhost:3000/login
- 管理者: admin@example.com
- マネージャー: manager@example.com
- メンバー: member@example.com
（パスワードは .env の DEMO_*_PASSWORD に設定した値）
確認が終わったら「サーバーを止めて」と言ってください。
```

### 7. 停止する

利用者が確認を終えたら、起動したバックグラウンドのタスクを停止する（TaskStop）。この PC はメモリが少ないので、使い終わったサーバーを残さないことが大事。

## ローカル DB を作り直すとき

「DB を作り直して」「パスワードを揃え直したい」「データが壊れた」と言われた場合のみ行う。ローカルのデータがすべて消えるので、実行前に利用者に確認を取る。

```bash
npm.cmd exec -- prisma migrate reset --force
npm.cmd run db:seed
```

`migrate reset` は全テーブルを作り直す。その後の seed で、`.env` のパスワードを持つ 3 アカウントとデモデータが入る。

## うまくいかないとき

| 症状 | 原因と対応 |
| --- | --- |
| `P1001: Can't reach database server at localhost:5432` | PostgreSQL サービスが止まっている（手順 2）。 |
| `password authentication failed for user "talent"` | `.env` の `DATABASE_URL` と、ローカルに作成した role のパスワードが一致していない。docs/LOCAL_DEVELOPMENT.md の初回セットアップを案内する。 |
| `Port 3000 is in use` | 既に起動している（手順 1）か、別のプロセスが使っている。既存のサーバーを使うか、利用者に停止してよいか確認する。 |
| ログインできない | seed のパスワードは既存ユーザーを上書きしない。`.env` を変更した後なら「DB を作り直す」手順が必要。 |
| 画面が極端に重い・タスクが強制終了された | メモリ不足。ブラウザの不要なタブや他のアプリを閉じてもらう。開発サーバーを複数起動していないか確認する。 |
