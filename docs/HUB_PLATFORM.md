# Hub 基盤の上での TalentHub

TalentHub は、Hub シリーズの製品 `talenthub` として、社内サーバの基盤（共通のログイン・テナント・社員情報・クラスタ）の上で動かす。このファイルは、TalentHub の側の構成と運用をまとめる。基盤の決まり（してはいけないこと、必ずすること、表・数値）は `contract/` を正とし、ここには写さない。

載せ替えの段取りと状態は `docs/ROADMAP.md` の「フェーズ H」、手順はスキル `.claude/skills/migrate-to-hub` を確認する。

## ファイルの持ち主

| 持ち主 | ファイル | 扱い |
|---|---|---|
| 基盤 | `contract/`、`scripts/update-contract.sh`・`hub-contracts.sh`・`devkit.sh`、`devkit.version`、`.claude/skills/hub-*/` | 書き換えない。版を上げるときに `scripts/update-contract.sh <版>` で丸ごと置き換える |
| 基盤（手元だけ） | `.devkit/` | `scripts/devkit.sh` が取り込む。git に入れない |
| TalentHub | `deploy/values.yaml`・`values-dev.yaml`・`values-prod.yaml` | 配布の設定。書ける項目は `contract/deploy-values.md` |
| TalentHub | `Dockerfile`（画面と API の `web`）、`Dockerfile.migrate`（`prisma migrate deploy` を流す `migrate`） | 基盤の CI はビルドの段（target）を選べないので、イメージごとにファイルを分ける |
| TalentHub | `dev/devkit.yaml`（Docker 版）、`dev/devkit.local.yaml`（Docker なし）、`docker-compose.yml` | 手元の devkit の設定 |
| TalentHub（基盤へ写す） | `deploy/platform/talenthub-dev.yaml`・`talenthub-prod.yaml` | 基盤のリポジトリの一覧ファイル（`deploy/applications/hubs/`）の下書き。H-7 で基盤への MR に写す。このリポジトリでは使わない |

## サービスと経路

| サービス | ポート | DB | 経路 |
|---|---|---|---|
| `talenthub-web` | 8080 | `db: true` | 画面 `/talent`、API `/api/talent/v1`、死活 `/talent/health`（認証なし） |

- 画面と API は 1 つのサービスで受ける（基盤に確認済み。hub-platform#4）。
- 経路の付け替え（`basePath` を `/talent` にし、API を `/api/talent/v1` に移す）は H-2 で行う。それまでは今の `/` の下のまま。死活の確認は、今は `/health`、H-2 の後は `/talent/health`。
- テーブルは `migrate` のジョブ（移行用のロール）が作る。アプリ用のロールはテーブルを作れない。

## 配布の流れ

1. `main` に merge する。
2. CI の `build:web`・`build:migrate` がイメージを作り、このリポジトリのレジストリに置く（タグはコミットの短い SHA）。
3. CI の `deploy:dev` が `deploy/values-dev.yaml` のタグを書き換えて `main` にコミットする。
4. 基盤の ArgoCD が dev（`talenthub-dev`）に配る。`migrate` のジョブが先に流れ、失敗するとサービスは前の版のまま残る。
5. prod は `production` ブランチで同じ流れ（`deploy:prod`）になり、人が ArgoCD で sync する。

イメージの作成とタグの書き換えは、基盤の CI のひな形（`ci/hub/deploy.gitlab-ci.yml` の `.hub_build_image`・`.hub_update_tag`）を使う。サービスを足したら、ジョブと `TAG_KEYS` にも足す。

### CI の変数

| 変数 | 意味 |
|---|---|
| `HUB_DEPLOY_ENABLED` | `true` にすると、`main`・`production` のパイプラインでイメージを作り、タグを書き換える。載せ替えが終わり、基盤への登録（H-7）が済むまでは設定しない |
| `HUB_BUILD_CHECK` | `true` を付けて手動のパイプライン（web）を動かすと、イメージの作成だけを確かめる（タグは書き換えない） |

どちらも無いときは、MR の検証（verify）とデモ DB の作業だけが今までどおり動く。

タグの書き換えには、リポジトリの「設定 → CI/CD → ジョブトークンの権限」で「ジョブトークンでの Git push を許可」を有効にしておく（`HUB_DEPLOY_ENABLED` を入れる前に、人が 1 回だけ行う）。

## 契約の版を上げる

`scripts/update-contract.sh <版>` で、`contract/`・基盤のスクリプト・基盤のスキルを丸ごと置き換える。`contract/CHANGELOG.md` を読み、TalentHub に要る変更を洗い出す。手順はスキル `hub-contract-update`。今の版は `contract/VERSION`。
