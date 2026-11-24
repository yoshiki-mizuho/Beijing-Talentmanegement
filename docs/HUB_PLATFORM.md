# Hub 基盤の上での TalentHub

TalentHub は、Hub シリーズの製品 `talenthub` として、社内サーバの基盤（共通のログイン・テナント・社員情報・クラスタ）の上で動かす。このファイルは、TalentHub の側の構成と運用をまとめる。基盤の決まり（してはいけないこと、必ずすること、表・数値）は `contract/` を正とし、ここには写さない。

載せ替えの段取りと状態は `docs/ROADMAP.md` の「フェーズ H」、手順はスキル `.claude/skills/migrate-to-hub` を確認する。

## ファイルの持ち主

| 持ち主 | ファイル | 扱い |
|---|---|---|
| 基盤 | `contract/`、`scripts/update-contract.sh`・`hub-contracts.sh`・`devkit.sh`、`devkit.version`、`.claude/skills/hub-*/` | 書き換えない。版を上げるときに `scripts/update-contract.sh <版>` で丸ごと置き換える |
| 基盤（手元だけ） | `.devkit/` | `scripts/devkit.sh` が取り込む。git に入れない |
| TalentHub | `deploy/values.yaml`・`values-dev.yaml`・`values-prod.yaml` | 配布の設定。書ける項目は `contract/deploy-values.md` |
| TalentHub | `Dockerfile`（画面と API の `web`）、`Dockerfile.migrate`（`prisma migrate deploy` を流す `migrate`）、`Dockerfile.job`（AI の予約を処理する `job`） | 基盤の CI はビルドの段（target）を選べないので、イメージごとにファイルを分ける |
| TalentHub | `dev/devkit.yaml`（Docker 版）、`dev/devkit.local.yaml`（Docker なし）、`docker-compose.yml` | 手元の devkit の設定 |
| TalentHub（基盤へ写す） | `deploy/platform/talenthub-dev.yaml`・`talenthub-prod.yaml` | 基盤のリポジトリの一覧ファイル（`deploy/applications/hubs/`）の下書き。このリポジトリでは使わない。dev は hub-platform!56 で出した。経路を変えるときは、基盤のリポジトリの方を MR で直す |

## サービスと経路

| サービス | ポート | DB | 経路 |
|---|---|---|---|
| `talenthub-web` | 8080 | `db: true` | 画面 `/talent`、API `/api/talent/v1`、死活 `/talent/health`（認証なし） |

- 画面と API は 1 つのサービスで受ける（基盤に確認済み。hub-platform#4）。
- 画面は `src/app/talent/`、API は `src/app/api/talent/v1/` に置き、静的アセットには `assetPrefix: "/talent"` を使う。API を `/talent` の外に置くため、`basePath` は使わない。死活の確認は `/talent/health`。
- テーブルは `migrate` のジョブ（移行用のロール）が作る。アプリ用のロールはテーブルを作れない。
- `SkillLevel` と `HubTenant` を除く全テーブルは `tenant_id` と RLS を持つ。`HubTenant` は定期実行が回るテナントの ID だけを持つ。アプリはリクエストごとに `X-Auth-Tenant-Id` をトランザクション内の `app.tenant_id` へ設定し、別テナントの行を DB 層で読み書きできない。migration 用の所有者 role は RLS の外、アプリ用 role は RLS の対象として動く。

## H-4 社員・組織の載せ替え

H-4 は、H-4a（gRPC の呼び出し基盤と偽の基盤）、H-4b（身元と権限）、H-4c（氏名・所属の表示、通知・監査ログの利用者 ID 化）、H-4d（自前の社員・部署列と CSV の整理）に分ける。H-4a では `src/server/platform/` の社員・組織取得、テナント別キャッシュ、エラー分類、standalone イメージへの proto 同梱と、E2E 用の偽の基盤までを用意した。H-4b では `User` を廃止して `Member.platformUserId` に身元をまとめ、基盤のリーダー情報から MANAGER と担当範囲を決め、メンバー登録・役割・上司・在籍の管理入口を外した。

H-4c では、氏名・メール・所属ノード・アバターの表示を、基盤の社員情報の一括取得に切り替えた。通知は操作した人の Member ID、監査ログは Member ID を保存し、氏名は表示のときに解決する。

H-4d では、自前の社員の列（社員番号・氏名・メール・部署・役職・アバター・上司）と `Department` の表を消し、`Member.platformUserId` を必須にした。部署・メンバーの CSV はやめ、保有スキルの CSV のメールは基盤の利用者と一括で突き合わせる。seed は devkit の決まった利用者 9 人に付け替えた。

## 配布の流れ

1. `main` に merge する。
2. CI の `build:web`・`build:migrate`・`build:job` がイメージを作り、このリポジトリのレジストリに置く（タグはコミットの短い SHA）。
3. CI の `deploy:dev` が `deploy/values-dev.yaml` のタグを書き換えて `main` にコミットする。
4. 基盤の ArgoCD が dev（`talenthub-dev`）に配る。`migrate` のジョブが先に流れ、失敗するとサービスは前の版のまま残る。
5. prod は `production` ブランチで同じ流れ（`deploy:prod`）になり、人が ArgoCD で sync する。

イメージの作成とタグの書き換えは、基盤の CI のひな形（`ci/hub/deploy.gitlab-ci.yml` の `.hub_build_image`・`.hub_update_tag`）を使う。サービスを足したら、ジョブと `TAG_KEYS` にも足す。

AI の予約は `cronJobs.talenthub-ai-jobs` が 5 分ごとに `job` イメージを起動して処理する。DB は `talenthub-web` と同じものを使い、基盤の LLM 接続先は共通 chart が環境変数で入れる。LLM を呼ぶのは 1 回の実行で 1 件までとし、処理中の依頼があるときと断られる時間帯（利用ガイド §4.9）は何もせずに終える。

### CI の変数

| 変数 | 意味 |
|---|---|
| `HUB_DEPLOY_ENABLED` | `true` にすると、`main`・`production` のパイプラインでイメージを作り、タグを書き換える。2026-11-23 に設定済み（保護あり） |
| `HUB_BUILD_CHECK` | `true` を付けて手動のパイプライン（web）を動かすと、イメージの作成だけを確かめる（タグは書き換えない） |

どちらも無いときは、MR の検証（verify）とデモ DB の作業だけが今までどおり動く。

タグの書き換えには、リポジトリの「設定 → CI/CD → ジョブトークンの権限」で「ジョブトークンでの Git push を許可」を有効にしておく（2026-11-23 に設定済み）。

イメージの作成は `main` と `production` でだけ動き、MR の CI では流れない。Dockerfile・`.dockerignore`・依存を変える MR は、merge 後の `main` の CI で `build:*` と `deploy:dev` が通ったことを確かめる。`job` イメージは `NODE_ENV=production` で `npm ci` するため、起動に要るもの（`tsx` など）は `dependencies` に置く。

## dev で確かめる

- 画面は `https://<dev の入口>/talent`。基盤のログインを通る。`/talent/health` は認証なしで応答する。
- アプリ・`migrate` のジョブ・定期実行の状態とログは、ArgoCD の `talenthub-dev` で見る。
- 最初はスキルとロールが空。ADMIN が CSV の画面から取り込む（スキル → 書き出し → ロールの 2 段階。スキルのコードは TalentHub が振る）。
- `SkillLevel`（Lv1〜5）は migration で入る。seed はクラスタでは流さない（デモの架空のデータが入るため）。

## 契約の版を上げる

`scripts/update-contract.sh <版>` で、`contract/`・基盤のスクリプト・基盤のスキルを丸ごと置き換える。`contract/CHANGELOG.md` を読み、TalentHub に要る変更を洗い出す。手順はスキル `hub-contract-update`。今の版は `contract/VERSION`。
