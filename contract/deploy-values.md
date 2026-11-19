# hub-app

Hub シリーズの製品のアプリを配る共通 chart。Hub のチームは、自分のリポジトリに設定ファイル（values）だけを書く。Deployment・Service・CronJob・Job・Secret はこの chart が作るので、Kubernetes のマニフェストは書かない。

動く見本は `example/`（dev で配って確かめたもの）。

## Hub のリポジトリに置くもの

1 つのディレクトリ（例: `deploy/`）に、次のファイルを置く。場所は一覧ファイルの `valuesPath` に書く。

| ファイル | 書くもの |
|---|---|
| `values.yaml` | 環境に依らない設定（サービスの名前・ポート・コマンド・共通の環境変数） |
| `values-dev.yaml` | dev の設定（イメージのタグ、dev だけの環境変数、dev の秘密情報の暗号文） |
| `values-prod.yaml` | prod の設定 |

配られ方:

| 環境 | 読まれるファイル | きっかけ |
|---|---|---|
| dev | `values.yaml` + `values-dev.yaml` | 一覧ファイルの `targetRevision`（例: `main`）のブランチが変わる |
| prod | `values.yaml` + `values-prod.yaml` | 同（例: `production`）。`autoSync: "false"` なら ArgoCD の画面で sync を押す |

新しい版を出すには、CI がイメージを作り、`values-<環境>.yaml` の `tag` を書き換えてコミットする。この 2 つは CI のひな形（`ci/hub/deploy.gitlab-ci.yml`）を読み込めば、変数を書くだけで済む。使い方はひな形の先頭のコメント。

## 書式

```yaml
# 全サービス・ジョブ共通の環境変数
env:
  LOG_LEVEL: info

# 全サービス・ジョブ共通の、Secret から入れる環境変数
secretEnv:
  DB_PASSWORD: {secret: talenthub-db, key: password}

# イメージを取るための認証情報は、基盤が namespace に入れてある。普通は何も書かない。
# グループ chosen-ryoiki-group の外のレジストリを使うときだけ、Secret 名を書く（下の sealedSecrets に置く）
# imagePullSecret: other-registry

# 常駐するサービス。キーが名前になる（一覧ファイルの routes の service に書く名前）
services:
  talenthub-api:
    image: registry.gitlab.com/<group>/talenthub/api
    tag: "abc12345"
    port: 8080
    replicas: 1                    # 省略時 1
    command: []                    # 省略時はイメージの既定
    args: []
    env: {}                        # このサービスだけの環境変数
    secretEnv: {}
    health: {path: /health}        # 省略すると、ポートがつながるかだけを見る
    resources:                     # 省略すると namespace の既定値
      requests: {cpu: 50m, memory: 128Mi}
      limits: {cpu: 500m, memory: 512Mi}

# 定期実行（時刻は UTC）
cronJobs:
  talenthub-cleanup:
    schedule: "0 18 * * *"
    image: registry.gitlab.com/<group>/talenthub/api
    tag: "abc12345"
    command: ["/app/cleanup"]

# 配るたびに、サービスより先に 1 回流すジョブ（DB のマイグレーションなど）
migrate:
  image: registry.gitlab.com/<group>/talenthub/migrate
  tag: "abc12345"
  command: ["/app/migrate", "up"]

# 秘密情報。暗号文を書く（次の節）
sealedSecrets:
  talenthub-db:
    encryptedData:
      password: AgB...
  talenthub-registry:
    type: kubernetes.io/dockerconfigjson
    encryptedData:
      .dockerconfigjson: AgB...
```

## DB

サービスに `db: true` と書くと、そのサービス用の DB を基盤が用意する。Hub は DB もパスワードも作らない。

```yaml
services:
  talenthub-api:
    image: ...
    port: 8080
    db: true              # このサービス用の DB ができる

migrate:
  image: ...
  command: ["/app/migrate", "up"]
  db: talenthub-api       # このサービスの DB に、移行用のロールで流す
```

用意されるもの（サービスごと）:

| もの | 中身 |
|---|---|
| DB | `hub_<製品名>_<サービス名>`。ほかのサービス・ほかの Hub からはつなげない |
| アプリ用のロール | 読み書きだけできる。テーブルは作れない。行単位の制限（RLS）を回避できない |
| 移行用のロール | DB の持ち主。テーブルを作る。`migrate` のジョブだけが使う |

コンテナに入る環境変数（`db: true` のサービスと、`db` を書いたジョブ）:

| 環境変数 | 内容 |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` | 接続先 |
| `DB_USER` / `DB_PASSWORD` | サービスにはアプリ用、`migrate` には移行用のロール |
| `DATABASE_URL` | 上をまとめた `postgres://...` の形 |

知っておくこと:

- 初めて配るときは、DB ができるまで十数秒、Pod が起動を待つ。
- テナントをまたいでデータが見えないようにするのは Hub の責任。全テーブルに `tenant_id` を持たせ、PostgreSQL の RLS を有効にすると、アプリ用のロールにはテナントの行だけが見える（方式は自由）。
- 移行用のロールで作ったテーブルは、アプリ用のロールが自動で読み書きできる。権限を付ける SQL は要らない。
- `db: true` を消しても、DB とデータは残る。消すときは基盤の担当に頼む。
- 定期実行（`cronJobs`）で DB を使うときは、`db: <サービス名>` と書く。

## 基盤が入れる環境変数

全コンテナに入る。Hub の values からは変えられない。

| 環境変数 | 内容 |
|---|---|
| `HUB_NAME` / `HUB_ENV` | 製品名と環境（`dev` / `prod`） |
| `PLATFORM_USER_ORG_GRPC_ADDR` | 基盤の社員情報・組織の gRPC の接続先 |
| `PLATFORM_TENANT_GRPC_ADDR` | 基盤のテナント情報の gRPC の接続先 |
| `PLATFORM_NOTIFICATION_GRPC_ADDR` | 基盤の通知を送る gRPC の接続先 |
| `PLATFORM_LLM_GRPC_ADDR` | 基盤の LLM を使う gRPC の接続先 |

使い方は、利用ガイド（`guide/README.md`）の §4。

## 秘密情報の入れ方

パスワードなどは、暗号化した文字列を values に書く。復号できるのはクラスタだけなので、リポジトリに置いてよい。暗号文は「その namespace・その名前」でしか復号できない。

1. `kubeseal` を入れる（https://github.com/bitnami-labs/sealed-secrets/releases ）。
2. この chart の `sealed-secrets-cert.pem`（暗号化用の公開の証明書）を取る。
3. 値を 1 つずつ暗号化し、出てきた文字列を `encryptedData` に書く。

```bash
printf '%s' '<パスワード>' | kubeseal --cert sealed-secrets-cert.pem --raw \
  --namespace talenthub-dev --name talenthub-db --from-file=/dev/stdin
```

- `--namespace` は `<製品名>-<環境>`、`--name` は `sealedSecrets` のキー。どちらかが違うと復号できない。
- dev と prod は namespace が違うので、別々に暗号化する。
- レジストリの認証は、`~/.docker/config.json` と同じ形の JSON を、キー `.dockerconfigjson` で暗号化する。

## 配られる順

1. 秘密情報
2. `migrate` のジョブ。失敗すると止まり、サービスは前のまま残る
3. サービスと定期実行

## この chart でできないこと

次のものが要るときは、一覧ファイルを `appPath` に切り替えて、自分のマニフェストを配る（`applications/hubs/README.md`）。

- 1 つの Pod に複数のコンテナ、ディスク（PersistentVolume）、HTTP 以外のポート
- Pod から Kubernetes の API を呼ぶ

どちらの形でも、Ingress・NetworkPolicy・ResourceQuota・LimitRange は書けない。経路・外向きの宛先・資源の上限は、一覧ファイルに書く。

## デスクトップ版の配信

`desktop/scripts/desktop.sh init` が書く。`image` と `tag` の両方があるときだけ、配信のサービス `<製品名>-desktop-dist`（8080 番）を作る。`tag` は CI（`hub:desktop:deploy:<環境>`）が書き換える。経路は一覧ファイルの `desktop: true`。

```yaml
# values.yaml
desktop:
  image: registry.gitlab.com/<group>/<repo>/desktop-dist
# values-dev.yaml
desktop:
  tag: "abc12345"
```
