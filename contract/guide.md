# Hub 基盤利用ガイド

Hub シリーズの製品（TalentHub など）を作るチーム向けに、基盤の使い方をまとめる。

- 対象: Reporthub と同じ k3s クラスタに載せる製品を、別のリポジトリ・好きな言語で作る人
- 背景と方針は、Reporthub のリポジトリ（`tokyo/reporthub`）の検討資料 27 / 28 / 29 にある。このガイドだけで開発は始められる
- 書いてあるのは、dev クラスタで動作を確かめた内容。まだ提供していないものは §8 にまとめてある
- この資料を直す人へ: 足す前に全体を読み、重複と古い記述を削ってから足す。1 つの決まりは 1 か所に書き、ほかは節の番号で指す。例は節ごとに 1 つ。節の番号と見出しは変えない。版を出すたびに行数を確かめる（目安は 650 行まで）
- 基盤への依頼と質問は、基盤のリポジトリの issue にテンプレートで出す（§6.4）

## 1. 全体像

基盤が持つもの: テナント、利用者、組織、ログイン、セッション。Hub はこれらを作らず、基盤から受け取る。

```
ブラウザ ──▶ Ingress ──▶ 認可中継（session-resolver）
                │              │ ログイン済みか / 製品が有効なテナントか
                │              ▼
                └────────▶ Hub のサービス      X-Auth-* ヘッダで身元を受け取る
                               │
                               └── gRPC ──▶ 基盤（社員情報・組織・テナント情報の読み取り、通知の送信、LLM の利用）
```

| 方法 | 何が得られるか | 章 |
|---|---|---|
| 入口で受け取る | いま操作している利用者とテナント | §3 |
| サーバから gRPC で呼ぶ | 社員情報、組織ツリー、所属、テナント情報。利用者への通知の送信、LLM での文章の生成 | §4 |
| ブラウザから基盤の REST を直接呼ぶ | ログイン中の本人の情報など、Reporthub の画面が使っている API | §5 |

## 2. Hub が決めること・守ること

**自由に決めてよいもの**: 言語、フレームワーク、内部の構成、DB の設計、マニフェストの形式（Helm chart / Kustomize / 素の YAML）、画面の枠組みと中身（見た目の決まりは §15）。

**守ること**:

| 項目 | 内容 |
|---|---|
| ログイン | 自前のログインを作らない。身元は入口が渡す `X-Auth-*` ヘッダで受け取る |
| 信じるヘッダ | `X-Auth-*` だけ。それ以外のヘッダ（`X-User-Id` など）は、クライアントが付けた値がそのまま届く |
| Cookie | Hub には届かない。Hub 独自の Cookie は使えない |
| テナント分離 | 自分の DB では、テナントをまたいでデータが見えないことを DB の層で保証する（方式は自由） |
| パス | 自分の接頭辞の下だけ（例: `/talent` と `/api/talent`） |
| Ingress・NetworkPolicy・ResourceQuota・LimitRange・クラスタ全体のリソース（Namespace など） | 自分のマニフェストに入れない（入れると配布が失敗する）。基盤が作る |
| 資源 | namespace の上限の中で動かす（§6） |

## 3. 入口で受け取る（認証ヘッダ）

### 3.1 流れ

1. ブラウザが Hub のパス（例: `/api/talent/v1/skills`）を呼ぶ。ログイン済みなら、セッションの Cookie が付いている。
2. Ingress が認可中継に問い合わせる。
3. 通れば、Ingress が身元をヘッダに載せて Hub のサービスへ渡す。通らなければ、Hub には届かない。

### 3.2 Hub に届くヘッダ

| ヘッダ | 内容 | 例 |
|---|---|---|
| `X-Auth-Tenant-Id` | テナントの ID（UUID） | `74d131e4-6552-4ad6-882e-53231369c95b` |
| `X-Auth-Tenant-Slug` | テナントの slug | `acme` |
| `X-Auth-User-Id` | 利用者の ID（UUID） | `0db5b2af-19ce-41fa-8995-de0fd542c6b3` |
| `X-Auth-User-Role` | 基盤でのロール。`MEMBER` / `ADMIN`。Hub の中の権限（誰が何を編集できるか）は Hub が自分で持つ | `ADMIN` |
| `X-Auth-Request-Id` | リクエストの ID。ログに出しておくと、基盤側のログと突き合わせられる | |

- クライアントが同じ名前のヘッダを付けて送っても、Ingress が正しい値で上書きする。
- JWT、セッション ID、Cookie は届かない。

### 3.3 Hub に届かずに返る応答

| 状況 | 応答 | 画面の扱い |
|---|---|---|
| 未ログイン、セッション切れ（画面の経路） | ログイン画面へ移す（302） | 何もしない（§3.7） |
| 未ログイン、セッション切れ（API の経路） | 401 | ログイン画面へ（§3.7） |
| そのテナントで製品が有効でない（§7） | 403 | 「利用できません」の表示 |
| POST / PUT / PATCH / DELETE で CSRF の検査を通らない（§3.4） | 403 | 同上 |

### 3.4 CSRF

書き込み系のメソッド（POST / PUT / PATCH / DELETE）は、入口で CSRF を検査する。Hub のサーバは検査しない。画面側がやること: Cookie `csrf_token` の値を JavaScript で読み、`X-CSRF-Token` ヘッダに入れて送る。画面の経路（`/<接頭辞>` の下）への書き込みだけは、トークンが無くても `Origin` のホスト（ポート込み）が同じなら通る（Next.js の Server Actions など、ヘッダを付けられない送り方のため）。API の経路（`/api/<接頭辞>`）はトークンが要る。

### 3.5 認証なしの経路

ヘルスチェックなど、ログインなしで開けたい経路は、一覧ファイルで `public: true` を付ける（§6）。

- 身元のヘッダは届かない。クライアントが付けても空にされる。
- 製品が有効かどうかの判定も通らない。テナントのデータを返さないこと。

### 3.6 実装の形（疑似コード）

```
tenantId = request.header("X-Auth-Tenant-Id")
userId   = request.header("X-Auth-User-Id")
if tenantId が空 or userId が空:
    return 401            # 認証つきの経路では起きないはず。設定ミスの検知用
# 以降、自分の DB へのアクセスは必ず tenantId で絞る
```

### 3.7 未ログインのとき

ログインの画面は基盤が持つ（今は Reporthub の画面のアプリ）。Hub はログインの画面を作らない。

- 画面の経路（`/<接頭辞>` の下）を未ログインで開くと、入口がブラウザを `/login?callbackUrl=<元のパス>` に移す。Hub の画面は何もしなくてよい。
- API の経路（`/api/<接頭辞>` の下）は 401 を返す。使っている途中でセッションが切れたときに起きる。画面は、API から 401 を受けたら、ブラウザを `/login?callbackUrl=<今のパス>` に移す。
- ログインが済むと、`callbackUrl` のパスに戻る。使えるのは、`/` で始まる同じドメインのパスだけ。それ以外は `/` に戻る。

## 4. サーバから gRPC で呼ぶ

### 4.1 接続先

Hub の namespace から届くのは、Hub 向けのポートだけ。平文の gRPC（TLS なし）。

| サービス | 接続先（dev の例） | 環境変数 | 内容 |
|---|---|---|---|
| user-org-service | `user-org-service.reporthub-dev.svc.cluster.local:9192` | `PLATFORM_USER_ORG_GRPC_ADDR` | 社員情報、組織、所属 |
| tenant-service | `tenant-service.reporthub-dev.svc.cluster.local:9195` | `PLATFORM_TENANT_GRPC_ADDR` | テナント情報 |
| notification-service | `notification-service.reporthub-dev.svc.cluster.local:9193` | `PLATFORM_NOTIFICATION_GRPC_ADDR` | 利用者への通知の送信（§4.8） |
| integration-service | `integration-service.reporthub-dev.svc.cluster.local:9184` | `PLATFORM_LLM_GRPC_ADDR` | LLM での文章・JSON の生成（§4.9） |

- 本番は namespace が `reporthub-prod` になる。接続先は環境変数で受け取る（共通 chart〔§6.1〕で配ると、表の名前で全コンテナに入る）。
- 基盤の内部用のポート（9092 / 9095 / 9084）には届かない。

### 4.2 proto

| ファイル | サービス |
|---|---|
| `contract/proto/user/v1/user_service.proto` | `user.v1.UserService` |
| `contract/proto/tenant/v1/tenant_service.proto` | `tenant.v1.TenantService` |
| `contract/proto/notification/v1/notification_service.proto` | `notification.v1.NotificationService` |
| `contract/proto/llm/v1/llm_service.proto` | `llm.v1.LLMService` |

どれも他のファイルを import していない。使うファイルを取って、自分の言語のコード生成ツール（`protoc`、`buf` など）にかける。各メソッドの意味と項目は、proto のコメントにある。取るときは、契約の版のタグを指定する（§11）。`main` の先頭からは取らない。

### 4.3 呼べるメソッド

| サービス | 分類 | メソッド |
|---|---|---|
| `user.v1.UserService` | 社員情報 | `GetUser` `GetUsers` |
| | 上長・リーダーの関係 | `GetSuperiorIDs` `GetDirectLeaderIDs` `GetDirectLeaderNodeIDs` `GetLeaderScopeNodeIDs` `CheckNodeLeaderAuth` |
| | 組織ツリー | `GetOrgNode` `ListChildOrgNodes` `ListSameLevelOrgNodes` `GetOrgSubtree` `GetSubtreeNodeIDs` |
| | 所属 | `GetNodeMembers` `GetNodeMembersBatch` `GetNodeMembership` `ResolveUserGroups` |
| `tenant.v1.TenantService` | テナント | `ResolveTenantBySlug` `GetTenant` |
| `notification.v1.NotificationService` | 通知（§4.8） | `SendNotification` |
| `llm.v1.LLMService` | LLM（§4.9） | `Generate` `ListModels` |

これ以外のメソッドは、proto に載っていても `PermissionDenied` が返る。必要なメソッドがあれば、基盤の担当に相談する。

### 4.4 メタデータ

| キー | 必須 | 内容 |
|---|---|---|
| `x-tenant-id` | user-org-service・通知・LLM では必須 | 入口で受け取った `X-Auth-Tenant-Id` をそのまま入れる。入口のヘッダが無い定期実行では、入口のヘッダから取って自分の DB に保存しておいた値を入れてよい。利用者の入力・URL・本文から取った値を入れない。付けないと、user-org-service ではデータが見つからない扱いになり、通知は `NotFound`、LLM は `InvalidArgument` を返す |
| `x-tenant-slug` | 任意 | `X-Auth-Tenant-Slug` |
| `x-request-id` | 推奨 | `X-Auth-Request-Id`。基盤側のログと突き合わせられる |

通知と LLM では、メタデータに加えて、要求の項目 `product` に自分の製品名を入れる（一覧ファイルの `name`。コンテナには環境変数 `HUB_NAME` で入っている）。そのテナントで製品が有効（§7）でなければ、`PermissionDenied` が返る。定期実行は、そのテナントを飛ばして続ける。

### 4.5 呼び方の例（grpcurl）

```sh
grpcurl -plaintext -H "x-tenant-id: <X-Auth-Tenant-Id の値>" -import-path ./proto -proto user_service.proto -d '{"user_id":"<利用者の ID>"}' user-org-service.reporthub-dev.svc.cluster.local:9192 user.v1.UserService/GetUser
```

通知と LLM も同じ形（proto・接続先・メソッドを替え、`-d` に §4.8 / §4.9 の項目を入れる。LLM の `Generate` は `-max-time 360` を付ける）。

### 4.6 社員情報の持ち方

- 氏名・メール・所属などは基盤が持つ。Hub の DB に写しを持たず、必要なときに gRPC で引く。
- Hub 固有の属性（スキル、資格など）は、Hub の DB に `user_id` と `tenant_id` をキーにして持つ。
- 一覧画面などで何度も引くときは、`GetUsers` や `GetNodeMembersBatch` でまとめて引く。短い時間のキャッシュは Hub の中で持ってよい。

### 4.7 エラー

| コード | 意味 | Hub 側の扱い |
|---|---|---|
| `NotFound` | 対象が無い。または `x-tenant-id` が違う・付いていない | 画面には「見つかりません」 |
| `PermissionDenied` | Hub 向けのポートで呼べないメソッド | 実装の誤り。呼ぶメソッドを見直す |
| `Unavailable` / `DeadlineExceeded` | 基盤が応答しない | 少し待って再試行する。続くなら、基盤なしで出せる範囲を出す |

通知と LLM には、口ごとのエラーがある（§4.8 / §4.9）。

### 4.8 通知を送る

`notification.v1.NotificationService` の `SendNotification`。テナントの利用者に通知を送る。利用者は、Reporthub の通知の一覧と画面上の通知で受け取り、押すと Hub の画面へ移る。

**渡すもの**

| 項目 | 必須 | 内容 |
|---|---|---|
| メタデータ `x-tenant-id` | 必須 | §4.4 |
| `product` | 必須 | 自分の製品名（`HUB_NAME`） |
| `user_ids` | 必須 | 宛先の利用者の ID（UUID）。1 件以上。同じ ID が重なっていても 1 件として扱う |
| `title` | 必須 | 題。渡した文字列がそのまま表示される（基盤は翻訳しない） |
| `body` | 任意 | 本文。同上 |
| `link_path` | 必須 | 通知を押したときの移動先。`/` で始まるパス |
| `idempotency_key` | 任意 | 同じ依頼を見分ける鍵。空なら、呼ぶたびに新しい通知ができる |
| `kind` / `category` / `priority` / `actor_user_id` / `ref_id` | 任意 | 製品が決める種類と未読の数を分ける分類（大文字の英字で始まり、大文字の英字・数字・`_` の 64 字まで）、`LOW` / `NORMAL` / `HIGH`（空は `NORMAL`。デスクトップ版の出し分け）、送った人（UUID。一覧に名前とアイコンが付く）、関連するものの ID（UUID）。分類ごとの未読の数は、画面から `GET /api/v1/notifications/unread-counts` の `byCategory`（`product` / `category` / `count`）で取れる |

**返るもの**: `accepted_user_ids`（今回、通知を作った宛先）と `rejected_user_ids`（送らなかった宛先 = そのテナントの利用者でない ID）。同じ `idempotency_key` で既に通知がある宛先は、どちらにも入らない。

**守られること**（数値は既定値で、基盤の側で変えることがある）

| 項目 | 内容 |
|---|---|
| 宛先 | `x-tenant-id` のテナントの利用者だけ。それ以外の ID は `rejected_user_ids` に入り、送られない。依頼の全体は失敗しない |
| 製品 | そのテナントで製品が有効（§7）なときだけ送れる。製品名と接頭辞の対応は基盤の側に登録してある。新しい Hub が通知を使うときは、登録を頼む（§6.4。登録が無い製品は `InvalidArgument`） |
| リンク先 | 自分の製品の画面の接頭辞の下だけ（TalentHub なら `/talent` か `/talent/...`）。`https://` などの URL、`//`、`..`、`\`、制御文字を含むものは受け付けない |
| 題と本文の長さ | 題は 100 文字まで、本文は 500 文字まで |
| 1 回の宛先 | 200 件まで |
| 回数 | テナントと製品の組ごとに、1 分あたり 60 回まで（宛先の数ではなく、呼び出しの回数） |
| 送り直し | 同じ `idempotency_key` の通知は、テナント・製品・利用者ごとに 1 つだけ作られる。送り直すことがある処理（定期実行、再試行つきのジョブ）では、依頼ごとに決まる値（例: `<出来事の種類>:<対象の ID>`）を入れる |

**エラー**

| コード | 意味 | Hub 側の扱い |
|---|---|---|
| `InvalidArgument` | 項目が空、`user_ids` が UUID でない・200 件を超える、題・本文が長すぎる、`link_path` が決まりに合わない、製品が登録されていない | 実装の誤り。送る前に Hub の側で長さと件数を確かめる |
| `NotFound` | `x-tenant-id` が付いていない | 実装の誤り |
| `PermissionDenied` | そのテナントで製品が有効でない | 送らずに終える。再試行しない |
| `ResourceExhausted` | 1 分あたりの回数の上限を超えた | 1 分ほど待ってやり直す。急がない通知ならあきらめる。宛先をまとめて 1 回で送ると、回数が減る |
| `Unavailable` / `DeadlineExceeded` | 基盤が応答しない | 同じ `idempotency_key` でやり直す。通知が送れなくても、Hub の処理そのものは失敗にしない |

**要求の例**（呼び方は §4.5。接続先は 9193）

```json
{"product":"talenthub","user_ids":["<利用者の ID>"],"title":"スキルの確認の依頼","body":"上長からスキルの確認を頼まれました。","link_path":"/talent/reviews/123","idempotency_key":"review-requested:123"}
```

### 4.9 LLM を使う

`llm.v1.LLMService`。社内の LLM（社内のモデル）で、文章か JSON を 1 回の呼び出しで作る。基盤が許可した Hub は、日報に由来しないデータに限り、社外のモデルも選べる（下の表）。指示の文（プロンプト）は Hub が持つ。`Generate` は指示と本文を渡して文章を受け取る。`ListModels` は選べるモデルの一覧と既定のモデルを受け取る。

**渡すもの（`Generate`）**。`ListModels` に渡すのは、`x-tenant-id` と `product` だけ。

| 項目 | 必須 | 内容 |
|---|---|---|
| メタデータ `x-tenant-id` | 必須 | §4.4 |
| `product` | 必須 | 自分の製品名（`HUB_NAME`） |
| `user_prompt` | 必須 | 本文 |
| `system_prompt` | 任意 | システムの指示 |
| `output_format` | 任意 | `OUTPUT_FORMAT_TEXT`（文章。指定しないときもこれ）か `OUTPUT_FORMAT_JSON` |
| `json_schema_hint` | 任意 | JSON で受け取るときの、形の説明。本文の後ろに足して LLM に渡される |
| `model` | 任意 | 使うモデル。空なら既定のモデル（必ず社内）。`ListModels` が返す一覧の中だけ |
| `allow_external` | 任意 | 社外のモデルを `model` に指定するときは `true`（必須）。立てるのは、社外に渡してよいデータの呼び出しだけ |
| `temperature` / `top_p` | 任意 | 生成のばらつき（0〜2）/ 候補の絞り込み（0〜1）。無ければモデルの既定 |

**返るもの**

| メソッド | 項目 | 内容 |
|---|---|---|
| `Generate` | `text` | 作った文章。JSON を指定したときは JSON の文字列 |
| `Generate` | `model_used` | 実際に使ったモデルの名前 |
| `ListModels` | `models` / `default_model` | 選べるモデルの一覧 / 既定のモデル（必ず社内） |
| `ListModels` | `model_infos` | `models` と同じ並びの、モデルごとの `name` と `external`（社外のモデルなら `true`） |

JSON を指定したとき、基盤が確かめるのは「JSON として読めること」だけ。壊れていれば基盤が 1 回だけ作り直し、それでも読めなければ `Internal` を返す。項目がそろっているかは、Hub の側で確かめる。

**守られること・知っておくこと**（数値と時間帯は既定値で、基盤の側で変えることがある）

| 項目 | 内容 |
|---|---|
| 保存 | 指示・本文・作った文章を、基盤は保存しない。ログにも出さない（残るのは、製品名・テナント・長さ・かかった時間・結果のコードだけ）。Hub の側でも、ログに出さない |
| 製品 | そのテナントで製品が有効（§7）なときだけ使える |
| 順番 | LLM を動かす機械は 1 台で、同時に動くのは 1 件だけ。Reporthub の処理が優先で、Hub の依頼はその後になる |
| 待ち | 順番を待つのは 30 秒まで。待っている Hub の依頼が 4 件あるとき、または 30 秒で順番が来ないときは、断られる |
| 断られる時間帯 | 毎日 02:00〜04:00 と、土曜の 02:00〜12:00（日本時間）。Reporthub の定期の処理が LLM を使う時間帯で、Hub の依頼はすぐに断られる |
| 1 日の上限 | テナントと製品の組ごとに、50 回まで、かつ生成にかかった時間の合計が 3,600 秒（1 時間）まで。日本時間の 0 時に戻る。失敗した呼び出しは数えない |
| 1 回の時間 | 生成は 300 秒（5 分）で打ち切られる。1 回の生成には、1〜5 分かかるのが普通 |
| 長さ | 入力は `system_prompt` と `user_prompt` と `json_schema_hint` の合計で 24,000 バイトまで（UTF-8。日本語は 1 文字が 3 バイトほどなので、約 8,000 文字）。出力は 1 回 2,048 トークンまでで、入力と出力の合計は 8,192 トークンまで（日本語はだいたい 1 文字が 1〜2 トークン）。超えた出力は切れて JSON が壊れるので、1 回の入力は 3,000 文字ほどまでにする |
| 社外のモデル | 渡してよいのは、日報の本文でも、日報から作ったデータでもないもの（例: 利用者が手で足したタスクの題と説明）。日報の本文と日報から作ったデータは、社内のモデルだけで扱う。使える製品とテナントは基盤の側で許可する（人に伝える）。許可が無ければ一覧に出ない。上の順番・待ち・断られる時間帯・1 日の上限の対象外で、別に、テナントと製品の組ごとに 1 日 200 回まで。1 回の時間は 30 秒まで（数秒で返るのが普通）。今は口だけで、本物の環境では、まだ一覧に出ない（出るようになったら `contract/CHANGELOG.md` で知らせる） |

- **社内のモデルは、画面からの即時の応答には向かない。** 利用者が画面で待つ処理から直接は呼ばない。定期実行やジョブから呼び、結果を Hub の DB に置いて画面に出す。社外のモデルは、利用者が画面で待つ処理から呼んでよい。止まっても機能が動くように、LLM を使わない代わりの処理を持つ。
- 社内のモデルを呼ぶ側の時間制限は、待ちの 30 秒と生成の 300 秒を合わせた長さより、少し長くする（6 分ほど）。
- モデルの名前をコードに固定しない。空で渡すか、`ListModels` で取る。
- 利用者の個人情報は、生成に必要な分だけを入れる。

**エラー**

| コード | 意味 | Hub 側の扱い |
|---|---|---|
| `ResourceExhausted` | 混んでいる、断られる時間帯、1 日の上限（社外のモデルは、社外の 1 日の上限だけ）。どれかはメッセージに含む語（`busy` / `batch window` / `daily quota` / `external daily quota`。変えない）で判定する。`external daily quota` を先に見る | 時間をおいてやり直す。混雑なら数分後、時間帯なら時間帯の後、1 日の上限なら翌日。急がないものはあきらめる |
| `Unavailable` | LLM が止まっている・届かない。社外のモデルは、呼び出す先が用意されていないときも | LLM なしで出せる範囲を出す。次の定期実行でやり直す |
| `DeadlineExceeded` | 生成が時間内に終わらなかった | 同上。入力を短くすると終わりやすい |
| `PermissionDenied` | そのテナントで製品が有効でない。またはテナントを確かめられない | 呼ばずに終える。再試行しない |
| `InvalidArgument` | `user_prompt` か `product` が空、`x-tenant-id` が無い、モデルが一覧に無い（許可の無い社外のモデルも同じ）、社外のモデルを指定して `allow_external` が `false`、入力が長すぎる、`temperature` / `top_p` が範囲外 | 実装の誤り |
| `Internal` | JSON を作り直しても読めなかった、など生成の失敗 | 指示を見直す。同じ入力でのやり直しは 1 回まで |

## 5. ブラウザから基盤の REST を直接呼ぶ

Hub の画面は Reporthub と同じドメインで動くので、ブラウザからは基盤の REST（`/api/v1/...`）をそのまま呼べる。セッションの Cookie が自動で付く。Hub のサーバを経由させない。書き込み系のメソッドは、§3.4 と同じく `X-CSRF-Token` を付ける。

Hub の画面から使ってよい API:

| API | 内容 |
|---|---|
| `GET /api/v1/auth/me` | ログイン中の本人の情報（表示名、アバターなど）。`X-Tenant-Slug` は要らない。`avatarUrl` は同じドメインの `/api/v1/users/{userId}/avatar`。空なら、頭文字と `avatarColor` で出す |
| `POST /api/v1/auth/logout` | ログアウト。この API だけ呼べばよい。`X-CSRF-Token` を付ける。呼んだ後、`/login` へ移る（dev での確認はまだ） |

ほかの API の定義は、基盤の各サービスの OpenAPI（今は Reporthub のリポジトリにある。必要な分は基盤の担当に聞く）。

## 6. クラスタに載せる

### 6.1 Hub が用意するもの

コンテナイメージと、設定ファイル。Kubernetes のマニフェストは書かなくてよい。

| 置くもの | 内容 |
|---|---|
| コンテナイメージ | Hub の CI が作り、Hub のレジストリに置く |
| `values.yaml` | 環境に依らない設定（サービスの名前・ポート・共通の環境変数） |
| `values-dev.yaml` / `values-prod.yaml` | 環境ごとの設定（イメージのタグ、環境変数、秘密情報の暗号文） |

設定ファイルから、基盤の共通 chart（`deploy/helm/hub-app`）が Deployment・Service・定期実行・マイグレーションのジョブ・Secret を作る。書式と、秘密情報の暗号化のやり方は、同じ場所の `README.md`。動く見本は `example/` と、`hub-template` の `deploy/`。

配られるきっかけ: dev は、`main` の設定ファイルが変わると自動で配られる。prod は、`production` の設定ファイルが変わった後、ArgoCD の画面で sync を押す。

**新しい版を出す流れ**は、「CI がイメージを作る → CI が `values-<環境>.yaml` の `tag` を書き換えてコミットする」。この 2 つは、基盤の CI のひな形（`ci/hub/deploy.gitlab-ci.yml`）を `include` し（`ref: main`。固定したいときは版のタグ）、`.hub_build_image`（変数 `IMAGE_NAME`）と `.hub_update_tag`（変数 `VALUES_FILE` `TAG_KEYS` `TARGET_BRANCH`）を `extends` するジョブを書けば済む。使い方の全文は、ひな形の先頭のコメント。動く例は、`hub-template` の `.gitlab-ci.yml`。テストやビルドの中身は Hub が自分で書く。

- runner は、グループ `chosen-ryoiki-group` の runner がそのまま使える。ジョブに `tags: [on-premises-runner]` と書くだけで、リポジトリごとの設定は要らない。
- 前提は 1 つ。リポジトリの「設定 → CI/CD → ジョブトークンの権限」で「ジョブトークンでの Git push を許可」を有効にすること（秘密情報は作らない）。
- 基盤の gRPC の接続先は、環境変数 `PLATFORM_USER_ORG_GRPC_ADDR` / `PLATFORM_TENANT_GRPC_ADDR` / `PLATFORM_NOTIFICATION_GRPC_ADDR` / `PLATFORM_LLM_GRPC_ADDR` で全コンテナに入る（§4.1）。製品名と環境は `HUB_NAME` / `HUB_ENV`。

**DB を使うとき**は、設定ファイルのサービスに `db: true` と書く。そのサービス用の DB・ロール・接続情報を基盤が用意し、環境変数（`DATABASE_URL`、`DB_HOST` ほか）でコンテナに入れる。Hub は DB もパスワードも作らない。テーブルは `migrate` のジョブで作る。書式は `deploy/helm/hub-app/README.md` の「DB」。

- DB はサービスごとに 1 つ。ほかのサービス・ほかの Hub・Reporthub の DB にはつながらない。
- サービスに入るのは、読み書きだけできるロール。行単位の制限（RLS）を回避できないので、テーブルに RLS を入れれば、テナントの行だけが見える。定期実行で RLS の外から対象（テナント・本人の ID と件数だけ）を引くときは、migrate で `SECURITY DEFINER` の関数を作ってよい（持ち主は `_mig`、テーブルは `FORCE` にしない、`search_path` を固定する、実行は `_app` にだけ許す）。
- dev も prod も自動。prod の係が使う管理用の接続は、基盤の担当が 1 回だけ用意する（`scripts/setup-db-provisioner.sh prod`）。
- 基盤の DB は TLS を使わない。`DATABASE_URL` には `sslmode=disable` が付いている。DB_HOST などの個別の値から組み立てるときも、`sslmode=disable` を付ける（lib/pq や golang-migrate は、付いていないと TLS を要求して失敗する）。

共通 chart でできないこと（1 つの Pod に複数のコンテナ、ディスク、HTTP 以外のポートなど）が要るときは、自分のマニフェストを配る形も選べる（一覧ファイルで `valuesPath` の代わりに `appPath` を書く）。その場合も、§2 の表にある種類のリソースは入れられない。

### 6.2 基盤に出してもらうもの

基盤のリポジトリの `deploy/applications/hubs/` に、環境ごとに 1 ファイル置く。書式は同じ場所の `README.md`。主な項目:

```yaml
name: talenthub
env: dev
repoURL: https://gitlab.com/<group>/talenthub.git
targetRevision: main
valuesPath: deploy        # 設定ファイルを置いたディレクトリ
autoSync: "true"
namespaceValues:
  routing:
    pathPrefix: talent
    routes:
      - path: /talent              # 画面
        service: talenthub-web
        port: 3000
      - path: /api/talent/v1       # API
        service: talenthub-api
        port: 8080
      - path: /api/talent/v1/health
        service: talenthub-api
        port: 8080
        public: true
```

| できるもの | 内容 |
|---|---|
| namespace `talenthub-dev` | Hub のアプリが入る場所 |
| 通信の規則 | 外へ出られるのは DNS と基盤の Hub 向け gRPC だけ。受けられるのは Ingress からだけ。同じ namespace の中は自由 |
| 資源の上限 | 既定は合計で CPU 要求 2 コア / メモリ要求 2Gi / Pod 30 個。1 コンテナは CPU 1 コア / メモリ 1Gi まで |
| Ingress | `routes` に書いた経路。認証と製品の判定つき |
| 配布 | `repoURL` の `valuesPath` にある設定ファイルから作ったアプリが、namespace に配られる |
| イメージを取るための認証情報 | グループ `chosen-ryoiki-group` 配下のレジストリから取れる認証情報が、namespace に入る。Hub は何も書かない |

### 6.3 知っておくこと

- **外部への通信は既定で閉じている**。Hub 専用の DB など、使う宛先は `namespaceValues.extraEgress` に書いて開ける。
- **資源を書いていないコンテナ**には、既定値（CPU 要求 50m / メモリ要求 64Mi、上限 200m / 256Mi）が入る。
- **上限の変更**は `namespaceValues.quota` / `limits` で行う。基盤の担当と相談する。
- **経路のパス**は、接頭辞の下で、英数字と `/` `_` `-` だけ。

### 6.4 Hub を登録する・初めて本番に出すとき

基盤の担当が Hub ごとに次を行う。下の 2 行を除き、初めて dev に出すときと、初めて prod に出すときの両方で要る。namespace・通信の規則・Ingress・イメージを取る認証情報（§6.2）は自動でできる。以後の配布とマイグレーションも、設定ファイルの変更だけで動く（§6.1）。

| 基盤の担当がすること | 内容 |
|---|---|
| 一覧ファイル | `deploy/applications/hubs/<製品名>-<環境>.yaml` をマージする（§6.2）。prod は `targetRevision: production`、`autoSync: "false"`（sync は人が押す） |
| 製品 | Reporthub の環境ごとの製品のカタログ `KNOWN_HUB_PRODUCTS` に足し、使うテナントの `enabled_products` に製品名を足す（§7） |
| 通知・問い合わせ | 使うときだけ。通知はリンク先の接頭辞を `HUB_PRODUCT_PREFIXES` に（§4.8）、問い合わせは起票先を `INQUIRY_PRODUCT_TARGETS` に足す |
| ArgoCD のアカウント | 頼まれたときだけ。自分の Hub のアプリを見る・sync する・ログを見る |
| DB | 頼まなくてよい。`deploy/values.yaml` のサービスに `db: true` があれば、係（`hub-db-provisioner`）が DB、`_app` / `_mig` のロール、接続情報の Secret を作る（§6.1） |

**本番に出すとき Hub のチームがすること**: `production` ブランチを作る。prod の sync の前に、CI が `deploy/values-prod.yaml` に本物のイメージのタグ（web / api / migrate / デスクトップ版など、使うもの全部）を書き込んだことを確かめる。デスクトップ版は、一覧ファイルの `desktop: true` と、この `desktop` のタグで配られる（§14.1）。

**依頼と質問の窓口**: 基盤のリポジトリの issue に、テンプレート [Hubの登録・本番公開の依頼](https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform/-/issues/new?issuable_template=Hub%E3%81%AE%E7%99%BB%E9%8C%B2%E3%83%BB%E6%9C%AC%E7%95%AA%E5%85%AC%E9%96%8B%E3%81%AE%E4%BE%9D%E9%A0%BC) か [基盤への質問](https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform/-/issues/new?issuable_template=%E5%9F%BA%E7%9B%A4%E3%81%B8%E3%81%AE%E8%B3%AA%E5%95%8F) で出す。ラベル `hub-request` が付く。このガイドで「基盤の担当に頼む・聞く」とあるものも、ここに出す。

## 7. 製品の有効化

Hub の経路は、その製品が有効なテナントの利用者だけが通れる。判定は入口で行うので、Hub は実装しない。

- 製品名は、一覧ファイルの `name`（例: `talenthub`）。
- テナントの横断設定 `enabled_products`（製品名の配列）に入っていれば有効。
- 設定は SYSTEM_ADMIN が行う（`PUT /api/v1/system/tenants/{tenantId}/settings`。settings 全体を置き換える API なので、既存のキーと一緒に送る）。
- 有効でないテナントの利用者には、入口が 403 を返す。

## 8. まだ提供していないもの

| 項目 | 状態 |
|---|---|
| イベントの購読（社員の追加・異動などの通知、ほかの Hub が出すイベント） | Hub の namespace から NATS には届かない。当面は gRPC で引く |
| ほかの Hub との連携 | 決まりは §12。口の一覧はある（§12.4）。Hub 同士の通信を開ける仕組みと、共通 chart（`hub-app`）でほかの Hub 向けの gRPC のポート（今は HTTP のポートだけ）を出す仕組みは、まだ無い（必要になった時点で、基盤の担当に伝える） |
| Hub 向けに安定を約束した REST の一覧 | 無い。§5 の表のほかは、Reporthub の画面と同じ API をそのまま使う |
| 共通の画面の部品（ヘッダ、ナビなど） | 無い。見た目の決まり（§15）を守って、各 Hub が作る。製品の切り替えも、まだ無い（ヘッダに製品の名前を出すだけ） |
| 手元で動かす基盤一式 | 基盤の本物を手元で動かす一式は無い。代わりに hub-devkit を使う（§9.1）。devkit が持っていないもの（基盤の REST の大半、ほかの Hub の口、イベント）は、dev で確かめる |
| gRPC の呼び出し元の確認 | 入っていない。Hub は `x-tenant-id` に §4.4 の値だけを入れること |

## 9. 手元での開発

### 9.1 devkit を使う

基盤が、手元（Docker）用の一式 hub-devkit を用意している。ログインした状態の画面から、基盤の口までを通して動かせる。

| もの | 中身 |
|---|---|
| 開発用の入口（`http://localhost:8000`） | 利用者を選ぶだけの画面（`/login`）でログインした状態を作り、Hub のアプリへ中継する。届くヘッダ（§3.2）と、Hub に届かずに返る 401 / 403（§3.3）は本物と同じ |
| 偽の基盤（gRPC） | §4.1 の 4 つの口の代わり。呼べるメソッド・メタデータ・エラーは本物と同じ。決まったデータ（テナント、組織、利用者）を返す。通知は記録するだけ、LLM は決まった文を返す |
| 手元の DB | PostgreSQL 16。クラスタと同じ名前の環境変数（`DATABASE_URL` ほか）でアプリに入る |

配り方はファイル。Hub のリポジトリに devkit のソース一式を取り込み（`.devkit/`。git の管理から外す）、Docker Compose がそこからビルドする。使う版は `devkit.version` に書いてコミットする（版を上げるのは §11.2）。レジストリへのログインは要らない。

```bash
scripts/devkit.sh up        # 取り込み → ビルド → 起動。ブラウザで http://localhost:8000/<パスの接頭辞>
```

- ひな形（`hub-template`）から作った Hub には、コマンドと起動の設定が入っている。
- すでにある Hub は、コマンドのファイル（基盤のリポジトリの `devkit/hub-files/devkit.sh`）を `scripts/` に写し、`scripts/devkit.sh update <版>`（`0.15.0` の形）→ `scripts/devkit.sh init <製品名> <パスの接頭辞>` で始める。
- 使い方の全部、設定の書式、決まったデータの ID、本物との違いは、基盤のリポジトリの `devkit/README.md`（取り込んだ後は `.devkit/README.md`）。
- 手元の開発専用。外から届く場所では動かさない。クラスタでは起動しない。
- Hub の CI の中で使うときは、基盤の担当に頼む（基盤のリポジトリを CI から読むための設定が要る）。

決まったデータの主な ID:

| ID | 中身 |
|---|---|
| `11111111-1111-4111-8111-111111111111` | テナント `local-dev`（製品が有効） |
| `22222222-2222-4222-8222-222222222222` | `local-dev` の管理者（ADMIN） |
| `11111111-1111-4111-8111-222222222222` | テナント `no-hub`（製品が有効でない。入口が 403 を返す） |

### 9.2 ほかの方法

- **ヘッダを自分で付けて呼ぶ**: Hub のサーバは `X-Auth-*` ヘッダを読むだけなので、入口を通さずに呼べる。サーバだけを確かめるとき用。

  ```sh
  curl http://localhost:8080/api/talent/v1/skills -H "X-Auth-Tenant-Id: 11111111-1111-4111-8111-111111111111" -H "X-Auth-Tenant-Slug: local-dev" -H "X-Auth-User-Id: 22222222-2222-4222-8222-222222222222" -H "X-Auth-User-Role: ADMIN"
  ```

- **基盤の gRPC の代わりを自分で作る**: 単体テストでは、proto から自分の言語でスタブ（決まった値を返す偽のサーバ）を作る。
- **本物の基盤につなぐ**: Reporthub のリポジトリ（`tokyo/reporthub`）のローカル環境を起動すると、Hub 向けのポートが `localhost:9192`（user-org-service）/ `9195`（tenant-service）/ `9193`（notification-service）/ `9184`（integration-service）で開く。

## 10. 困ったとき

| 症状 | 見るところ |
|---|---|
| Hub のパスが 401 | ログインしているか。Reporthub の画面が開けるかで切り分ける（手元の devkit では `/login` で利用者を選ぶ） |
| Hub のパスが 403 | テナントで製品が有効か（§7）。書き込み系なら `X-CSRF-Token` を付けているか |
| Hub のパスが 404、または Reporthub の画面が出る | 一覧ファイルの `routes` にその経路があるか |
| Hub のパスが 502 / 503 | Hub の Pod が動いているか。`routes` の `service` と `port` が合っているか |
| gRPC がタイムアウト | 接続先が Hub 向けのポートか（§4.1。内部用のポートには届かない）。LLM は 1 回に数分かかるので、呼ぶ側の時間制限が短すぎないか（§4.9） |
| gRPC が `PermissionDenied` | §4.3 に無いメソッドを呼んでいる。通知と LLM では、テナントで製品が有効か（§7）、`product` が自分の製品名か |
| 通知が `InvalidArgument` | `link_path` が自分の接頭辞の下か。製品が基盤に登録されているか（§4.8） |
| LLM が `ResourceExhausted` | 断られる時間帯か、1 日の上限か、混んでいるか（§4.9）。メッセージで分かる |
| gRPC が `NotFound` | `x-tenant-id` を付けているか。値が入口で受け取ったものか |
| 外部の API や DB につながらない | `extraEgress` に宛先を書いたか |
| 配布が失敗する | マニフェストに、入れられない種類のリソース（§2 の表）が入っていないか |
| Pod が作られない | 資源の上限（§6.2）を超えていないか |

基盤側のログと突き合わせるときは、`X-Auth-Request-Id` の値を基盤の担当に伝える。

## 11. 契約の版

基盤が Hub に約束するもの（proto、入口のヘッダ、CSRF の方式、画面の見た目の決まり）には、まとめて 1 つの版を付ける。

### 11.1 版の形と印

| 項目 | 決まり |
|---|---|
| 版の形 | `major.minor.patch`。互換を壊す変更は major、追加は minor、説明の修正は patch |
| 版の印 | 基盤のリポジトリの git タグ `hub-contract/v<版>` |
| 1.0.0 より前 | 最初の Hub が本番に載るまでは 0.x。この間は minor でも互換を壊すことがある。壊すときは §11.5 の記録に書く |

基盤のサービス自体には版を付けない。クラスタで動いているものが常に 1 つで、互換は §11.4 の規則で守る。

### 11.2 proto の取り方

タグを指定して取り、取った版を自分のリポジトリの `contract/VERSION` に記録する。版を上げる入口は `scripts/update-contract.sh` の 1 つ（正本は基盤のリポジトリの `contract/hub-files/`）。1 回で、次がその版に揃う。

- 契約: proto（`contract/proto/`）・Claude Code 向けの決まりとスキル・このガイド（`contract/guide.md`）・設定ファイルの書式（`contract/deploy-values.md`）・見た目の決まり（§15）・口の書式（`contract/hubs/FORMAT.md`）
- `scripts/` の基盤のスクリプト（`update-contract.sh` 自身、`hub-contracts.sh`、devkit を使う Hub は `devkit.sh`）と `devkit.version`。デスクトップ版を持つ Hub は `desktop/desktop.version` と `desktop/scripts/desktop.sh` も

`scripts/update-contract.sh <版>`（例: `0.15.0`。`hub-contract/v0.15.0` の形でもよい。取り込めるのは 0.14.0 以降）。スクリプトが無い Hub は、基盤の `contract/hub-files/update-contract.sh` を `scripts/update-contract.sh` に写す（最初の 1 回だけ。後は、取った版のものに置き換わる）。

### 11.3 Claude Code に基盤の決まりを伝える

Hub のリポジトリで Claude Code を使うときは、基盤の決まりをまとめたファイル `contract/hub-platform-for-claude.md` を §11.2 のコマンドで取り、Hub のリポジトリの `CLAUDE.md` に `@contract/hub-platform-for-claude.md` の 1 行を書いて読み込む。

- このファイルは Hub の側で書き換えない。版を上げるときに丸ごと置き換える。
- Hub 固有の決まり（言語、構成、テストのやり方）は、Hub の `CLAUDE.md` に書く。
- よくある作業の手順は、Claude Code のスキルとして配る（正本は基盤のリポジトリの `contract/skills/hub-*/`）。`scripts/update-contract.sh` が Hub の `.claude/skills/hub-*/` に置き、版を上げるたびに置き換える。Hub 独自のスキルは、`hub-` で始まらない名前で足す。

### 11.4 互換の規則

| 対象 | 規則 |
|---|---|
| gRPC | フィールドと RPC は追加だけ。意味の変更・番号の再利用・削除はしない |
| 入口のヘッダ | 追加だけ |
| Hub の側 | 知らないフィールド・知らないヘッダは無視する。enum の知らない値で落ちない |

- 基盤のリポジトリの CI が、proto の互換を壊す変更を MR の時点で止める。
- 互換を壊す変更が避けられないときは、「足す → 移す → 消す」の 3 段で行う。新しいものを足して基盤を本番に出し、各 Hub が切り替えて本番に出し、全 Hub が切り替わったことを確かめてから古いものを消す。消す予定は、消す版の 1 つ前の版までに §11.5 に書く。

### 11.5 変更の記録

版ごとの変更と、Hub の側ですることは、基盤のリポジトリの `contract/CHANGELOG.md`（Hub のリポジトリには `contract/CHANGELOG.md` に写しが入る）。

## 12. ほかの Hub と情報をやり取りする

### 12.1 どこに置くかを先に決める

| 情報 | 置き場所 |
|---|---|
| 2 つ以上の Hub が使う、人・組織・テナントに関する情報 | 基盤に寄せる。基盤の契約として出す |
| ある Hub が持ち主で、ほかの Hub が参照する情報 | 持ち主の Hub が口を出す（§12.2） |

### 12.2 口の出し方

| 項目 | 決まり |
|---|---|
| 持ち主 | 情報を出す側の Hub。proto とイベントの定義を自分のリポジトリの `contract-out/` に置き（§12.4）、版のタグ（`<製品名>-contract/v<版>`）を付ける |
| 互換 | 基盤の契約と同じ規則（§11.4） |
| 同期で渡す | gRPC。出す側は、ほかの Hub 向けのポートを内部用と分けて立て、渡してよい読み取りのメソッドだけを通す |
| 呼ぶ場所 | サーバ同士。自分の Hub のサーバが gRPC で取り、自分の画面に渡す |
| 非同期で渡す | 基盤の NATS のイベント。subject は `events.<製品名>.<ドメイン>.<出来事>` |
| テナント | 呼ぶ側は、基盤を呼ぶときと同じ値（§4.4）を渡す。出す側は、そのテナントのデータだけを返す |
| 通信を開ける | 出す側と呼ぶ側の両方の一覧ファイルに書き、基盤の担当がマージする |
| 画面 | 相手の Hub の画面へはリンクで移る。同じドメインなので、ログインし直しは要らない |

### 12.3 してはいけないこと

- 相手の Hub の DB を読む、相手の Hub のテーブルを自分の DB に複製する。
- 相手が「ほかの Hub 向け」として出していない API を呼ぶ。
- ブラウザから、相手の Hub の API を呼ぶ。ブラウザを中継にして、相手の情報を自分のサーバへ運ぶ。
- 基盤を通さずに、Hub 同士でログインの情報（セッション・JWT）を受け渡す。
- 口ができるのを待つ間に、回り道（上の 3 つ、外部のサービスを直接呼ぶ）を作り込む。

### 12.4 公開している口の一覧

各 Hub が出している口と、予定している口は、基盤のリポジトリの `contract/hubs/README.md` に一覧がある。Hub ごとの説明と定義（proto）は `contract/hubs/<製品名>/`。

**置く（出す側）**: 自分のリポジトリの直下に `contract-out/` を作る。予定だけのときも置ける。書式は `contract/hubs/FORMAT.md`（基盤から取った写し）。

| ファイル | 中身 |
|---|---|
| `contract-out/README.md` | 人が読む説明。何を、誰向けに出しているか。メソッド・イベントの一覧。予定しているもの |
| `contract-out/hub.yaml` | 機械が読む要約。製品名、版、口の一覧（種類、名前、説明、状態 = `available` / `planned`、予定の issue）、問い合わせ先 |
| `contract-out/proto/` | proto（あれば） |

**集まる**: 基盤の CI が、各 Hub のリポジトリの既定のブランチから `contract-out/` を読み、一覧を作り直す。1 日 1 回と、Hub の `contract-out/` が変わったとき（Hub の CI に、ひな形 `.hub_contract_notify` を使うジョブがある場合）。Hub の側で写しを送る作業は要らない。載ったかどうかは、一覧の「集めた結果」の表（Hub ごとの状態と、Hub の側ですること）で確かめる。新しい Hub は、リポジトリを作った時点で、基盤のリポジトリの `contract/hubs/sources.yaml` に足す MR を出す。

**確かめる（使う側）**: 写しを持たず、見るたびに基盤のリポジトリの最新を読む。`scripts/hub-contracts.sh` を使う。

```bash
scripts/hub-contracts.sh                    # 一覧（全 Hub の、出している口と予定）
scripts/hub-contracts.sh reporthub          # その Hub の説明と、定義のファイルの一覧
scripts/hub-contracts.sh reporthub --take   # 定義を、自分のリポジトリの contract/hubs/reporthub/ に取り込む
```

`--take` は、使うと決めた定義だけに使う。取り込んだ時点の基盤のコミットが `contract/hubs/<製品名>/VERSION` に入る。コードの生成には、取り込んだ定義を使う。

**調べる順**: ほかの Hub の情報が要るとき、基盤に無いものが要るときは、作る前に一覧を見る。

| 一覧での状態 | すること |
|---|---|
| 出している口にある | 使う。通信を開ける MR を基盤のリポジトリに出し、定義を `--take` で取り込む |
| 予定している口にある | 待つ。急ぐとき・欲しい項目があるときは、その issue に書き込む。相手の口なしでも動くように作っておく |
| 無い | 基盤のリポジトリ（`chosen-ryoiki-group/hamburg/hub-platform`）に issue を出す。基盤に寄せるか、持ち主の Hub が口を出すかを決める（§12.1） |

一覧に載るのは「定義がある」ことだけ。通信を開けるのは、一覧ファイルの変更を基盤の担当がマージしたとき（§12.2）。

## 13. 組み込むか、別のアプリにするか

新しい機能を、いまある Hub に組み込むか、別のアプリ（別の Hub）にするかの決め方。既定は、別のアプリ。次のどれかに当たれば、別のアプリにする。

| 条件 | 例 |
|---|---|
| 作るチーム・リポジトリが別 | 別のチームが、自分の言語と予定で作る |
| テナントごとに有効・無効を切り替えたい | 製品の有効化（§7）は Hub の単位 |
| それだけを目的に開く | 利用者が、その画面を開くために来る |
| 基盤の情報だけで成り立つ | 社員情報・組織・通知・LLM があれば動く |

- 連携が深いことは、組み込む理由にしない。相手が無効でも自分の本体が動くなら、別にできる。
- 機能は、「それが表示される画面」を持つ側が作る。データの持ち主は、読み取りの口を出す（§12.2）。
- 新しい Hub は、GitLab のサブグループを分ける（`chosen-ryoiki-group/<都市>/<リポジトリ>`）。

## 14. デスクトップ版

デスクトップ版は、製品（Hub）ごとに別のアプリにする。中身は、Web の画面を読み込む薄い殻（Electron）。

### 14.1 持ち分

| 持つ側 | 持つもの |
|---|---|
| 基盤 | 殻の共通のコード（窓、ログインの維持、通知の受け取り、ネットワークの復帰、Electron の版上げ）。基盤のリポジトリの `desktop/shell/` に 1 つだけ持つ |
| 各 Hub | 設定（製品名、最初に開くパス、アプリの名前、アイコン、接続先、配信先）と、製品専用の機能（あれば）。製品ごとにビルドする |

- 始め方（スキル `hub-desktop`。詳しくは基盤のリポジトリの `desktop/README.md`）:
  1. `scripts/update-contract.sh <版> --desktop`
  2. `desktop/scripts/desktop.sh init <製品名> <最初に開くパス> <アプリの名前>`。殻の取り込み、製品設定（接続先・配信先は埋まる）、仮のアイコン、`deploy/values*.yaml` の `desktop:` まで済む。
  3. 基盤の担当に、一覧ファイルへ `desktop: true` を足してもらう（配信の経路 `/<接頭辞>/desktop` ができる）。利用者に案内する入手先は `/<接頭辞>/desktop/dev/setup.zip`（本番は `/desktop/stable/setup.zip`）。
  - CI は基盤のひな形のジョブ（`hub:desktop:*`）が、`desktop/product.config.js` があるときだけ動く。Hub は CI に書かない。
  - 版を上げるときは、`scripts/update-contract.sh <版>`（§11.2）の後に `desktop/scripts/desktop.sh update`。
- 製品ごとに別アプリ = 別 userData = 別 Cookie ストアなので、ログインは製品ごと（初回のみ。以後はセッションがディスクに残る）。片方のログアウトは、もう片方に影響しない。

### 14.2 通知

| 種類 | 中身 | 出し方 |
|---|---|---|
| アプリ個別 | その製品の通知。基盤の通知の口（§4.8）で送るときの `product` が、自分の製品のもの | その製品のアプリだけが出す |
| 全体共通 | 基盤が出すもの（問い合わせへの返信、管理者からのお知らせ、アカウントに関すること） | アプリの中の通知の一覧には、どのアプリにも出す。Windows の通知は、起動中のアプリのうち 1 つだけが出す |

同じ通知を重ねて出さない仕組みは、殻の共通のコードが持つ。Hub は作らない。画面は `window.hubDesktop.notify({ id, title, body, href, product, platformCommon })` を呼ぶだけで、殻が要求ごとに決める。

- `platformCommon` が `true` なら全体共通。PC の中の出し役（製品をまたぐロックファイルで決める 1 つのアプリ）だけが出す。同じ `id` は重ねて出さない。
- それ以外は、`product`（空なら `reporthub`）が製品設定の `product` と同じアプリだけが出す。Reporthub の通知は `product` が空。

### 14.3 Hub の画面が守ること

- ブラウザで開いても同じように動くこと。殻だけにある機能を前提にしない。
- 外部のリンクは、殻の外のブラウザで開く。同じドメインのリンクは、殻の中で開く。
- 殻は窓の題の帯を出さず、画面のヘッダがその代わりをする。窓のボタンのために右端を空けるのと、ヘッダをつかんで窓を動かせるようにするのは、殻が行う。画面が守るのは、ヘッダの目印（class `hub-header`）と高さ（60px）など。`design/layout.md` の §6（§15）。

### 14.4 今の状態

- 共通の殻と、取り込み・ビルドの仕組みはある（§14.1）。設定とアイコンを置くだけで、製品ごとのインストーラを作れる。
- 通知の出し分け（§14.2）は殻にある（0.17.0 から）。タスクバーの未読のバッジは、製品ごとに分けていない。

## 15. 画面の見た目の決まり

どの Hub の画面も同じ製品群に見えるように、基盤が「見た目の決まり」を配る。元は Reporthub の今の画面。配るのは決まりまでで、部品は配らない（§8）。

| 場所 | 共通（決まりを守る） | 製品ごと（Hub が決める） |
|---|---|---|
| ヘッダ | 高さ、地、区切り、並べ方。左に製品の名前、右端に本人のメニュー | 中央と右に置くもの（検索、通知、新しく作るボタンなど）。置かなくてもよい |
| 左のナビ | 幅、項目の大きさ、選択中の見た目、アイコンの大きさ | 項目（どの画面を、どの順で） |
| 本体 | 色、文字、余白、角の丸み、影。基本の部品（ボタン、入力欄、カード、バッジ、表など）の見た目 | 何を置くか |

- 決まりの本体は、基盤のリポジトリの `design/`。値は `tokens.css`（CSS の変数。どの枠組みでも読み込める）、枠は `layout.md`、基本の部品は `components.md`、組んだ実物は `example.html`。何が共通で何が自由かは `design/README.md`。
- 取り方: `scripts/update-contract.sh <版>` で `contract/design/` に入る。画面は `contract/design/tokens.css` を読み込み、色や寸法を変数で書く。写しは書き換えない。
- 値を変えたいとき・足りないときは、Hub の側で値を作らず、基盤のリポジトリに issue を出す。例外は主の色（`--hub-color-primary-*` の 11 段と `--hub-color-text-on-primary`）で、製品ごとに 1 か所で上書きしてよい（`design/README.md`「主の色」）。
