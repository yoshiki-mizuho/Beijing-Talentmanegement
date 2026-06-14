# Phase 2 完了レビュー

## レビュー対象

- `package.json`
- `src/`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma.config.ts`
- `.gitlab-ci.yml`
- `Dockerfile`
- `docker-compose.yml`
- `k8s/base/`

## 判定

Phase 2の完了条件は満たしています。

## 完了条件ごとの確認

| 完了条件 | 判定 | 根拠 |
| --- | --- | --- |
| アプリケーションがローカルで起動できる | OK | `npm run build` が成功し、standalone serverで `/login` がHTTP 200を返すことを確認 |
| DB migrationとPrisma Client生成が実行できる | OK | `prisma migrate dev --name init` で初期migrationを作成・適用、`npm run prisma:generate` が成功 |
| GitLab CI/CDで基本チェックが実行される | OK | `.gitlab-ci.yml` に `lint`、`typecheck`、`test`、`build`、`migration_check`、`SAST` を定義 |
| Dockerコンテナとして起動できる | OK | `docker build .` と `docker compose up -d --build` が成功し、Compose経由の `/login` がHTTP 200を返すことを確認 |

## Phase 2で追加したこと

- Next.js 16系 App Router、TypeScript、Tailwind CSS、shadcn/ui前提の設定、lucide-reactを導入した。
- `docs/ARCHITECTURE.md` の方針に沿って `src/app`、`src/modules`、`src/shared`、`src/server` の初期構成を追加した。
- Phase 1のドメイン設計をもとに、Prisma schemaと初期migrationを追加した。
- Prisma 7の設定方式に合わせて `prisma.config.ts` と PostgreSQL adapterを導入した。
- Auth.jsは `next-auth` Credentials providerを仮置きし、seedユーザーで `admin`、`manager`、`member` を確認できる構成にした。
- `/login`、`/dashboard`、主要画面のプレースホルダーを追加した。
- Dockerfile、docker-compose、Kubernetes初期manifestを追加した。

## 確認コマンド

| コマンド | 結果 |
| --- | --- |
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npm run test` | OK |
| `npm run prisma:migrate:check` | OK |
| `npm run build` | OK |
| `prisma migrate dev --name init` | OK |
| `npm run db:seed` | OK |
| `docker build .` | OK |
| `docker compose up -d --build` | OK |

## ブラウザ確認

- `/login` が表示できることを確認した。
- `admin@example.com` / `password` でログインし、`/dashboard` に遷移することを確認した。
- ダッシュボードでログインユーザー `Admin User` と権限 `ADMIN` が表示されることを確認した。

## Phase 3以降へ回すもの

- メンバー、スキル、ロール、メンバースキル、申告承認の業務CRUD実装。
- RBACの画面/API適用。
- 監査ログの実記録。
- 通知の実処理。
- CSV import/exportのプレビュー、検証、差分、登録処理。
- Kubernetesの環境別overlay、Ingress、実際のSecret管理。
- 企業IdP連携。

## 注意点

- Auth.jsの企業IdPは未決のため、Phase 2ではCredentials providerによるローカル検証用ログインに留めた。
- Prisma 7では `DATABASE_URL` を `schema.prisma` ではなく `prisma.config.ts` で扱う。
- Docker Desktop環境ではDocker daemon操作に昇格実行が必要だった。
