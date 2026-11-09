# Phase 4.5 完了レビュー

## レビュー対象

- `vercel.json`
- `.gitlab-ci.yml`（`demo_db_migrate`、`demo_db_seed`）
- `prisma/seed.ts`、`prisma/seed-demo-data.ts`
- `docs/DEMO_DEPLOYMENT.md`

## 判定

Phase 4.5の完了条件を満たしている。確認日は2026-10-09。一部の運用確認は下記の「残課題」として持ち越す。

## 環境構成

| 要素 | 内容 |
| --- | --- |
| アプリ | Vercel Hobby（個人プロジェクト。社内利用の可能性が出た場合は社内サーバへデプロイする） |
| DB | Neon（`us-east-1`。Vercelの実行リージョン `iad1` と同じ地域） |
| デプロイ経路 | GitLab `main` → push mirror（protected branchのみ）→ GitHub Private → Vercel Production |
| migration / seed | GitLab CIの手動ジョブ（Run pipelineで `DEMO_DB_TASK` を指定） |

## 完了条件ごとの確認

| 完了条件 | 判定 | 根拠 |
| --- | --- | --- |
| Production URLで3ロールがログインでき、主要画面が表示される | OK | ADMIN: dashboard、members、skill-mapを表示。MANAGER: dashboard、skill-approvals、skill-mapを表示。MEMBER: 本人用dashboardを表示 |
| 権限外の画面とAPIが拒否される | OK | 未ログイン: 画面は `/login` へ307、`/api/members`・`/api/skills` は401。MANAGER: `/csv` はdashboardへリダイレクト。MEMBER: `/members`、`/skill-approvals` はdashboardへリダイレクト、`/api/members` は403 |
| デモデータで主要機能を確認できる | OK | メンバー14名、承認待ち2件、ロール充足率、カテゴリ構成、スキルマップ（14名 × 23スキル）を表示 |
| merge、反映、migration、seedの手順が明文化され動作している | OK | !13 のmergeがpush mirrorでGitHubへ同期されることを確認。`demo_db_migrate`・`demo_db_seed` の成功を確認 |

## 公開までに発生した問題と対応

| 問題 | 原因 | 対応 |
| --- | --- | --- |
| Vercelのビルドが `PrismaConfigEnvError` で失敗 | `vercel.json` の `"main": true` だけでは、指定していないブランチのデプロイが有効のまま。DB設定のないPreviewでビルドが走っていた | `"**": false` を追加（!12） |
| GitLabでのmergeがProductionに反映されない | VercelはGitHubミラーに接続しているが、ミラーが同期されていなかった | GitLabのpush mirrorを設定し、ローカルから二重にpushする設定を削除（!13） |
| 手元からNeonへ接続できない（P1001） | 社内ネットワークでPostgreSQLプロトコルが遮断されていた（TCP接続はできるが、SSLRequestに応答がない） | GitLab CIの手動ジョブで実行する方式に変更（!14） |
| Run pipelineで変数を入力できない | プロジェクト設定でパイプライン変数が `no_one_allowed` になっていた | パイプライン変数を使える最小ロールをOwnerに変更 |
| `demo_db_seed` が `AuthRole` をimportできない | CIのジョブ内でPrisma Clientを生成していなかった | seedの前に `prisma:generate` を実行（!15） |

## 残課題

- Neonの復元手順（point-in-time restoreまたは論理バックアップからの復元）を、架空のレコードで試していない。
- CRUD操作の後に再ログインまたは再デプロイしても、データが保持されることを確認していない。
- Vercel Function logsで、接続数の枯渇や初期化エラーが出ていないことを確認していない。
- 以前の動作確認で登録したデータ（スキル5件、ロール「Javaマスター」、カテゴリ3件）がNeonに残っている。利用者が後で削除する。
- Run pipelineで `DEMO_DB_TASK` を選べるように、CI/CD inputsへ移行することを検討する。
