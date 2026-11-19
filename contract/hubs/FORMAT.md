# contract-out/ の書式

Hub が、ほかの Hub 向けに公開する口（gRPC とイベント）の説明と定義を置く場所。Hub のリポジトリの直下に作る。
基盤の CI が、既定のブランチの `contract-out/` を集めて、このディレクトリ（`contract/hubs/<製品名>/`）に写し、一覧のページ（[README.md](README.md)）に載せる。

```
contract-out/
├── README.md     人が読む説明
├── hub.yaml      機械が読む要約
└── proto/        proto（あれば）
```

- 予定だけのとき（まだ何も出していないとき）も置ける。ほかの Hub が、予定を見て待てる。
- 置けるのは通常のファイルだけ。全部で 200 ファイル・2 MB まで。秘密の値を書かない。
- 口を出す決まり（ポートの分け方、subject の形、互換、通信の開け方）は、`guide/README.md` の §12。

## hub.yaml

```yaml
name: reporthub              # 製品名。基盤が集めるときの名前と同じにする
version: 0.1.0               # 出している定義の版。タグ <製品名>-contract/v<版> と合わせる。まだ何も出していなければ 0.0.0
contact: Reporthub のチーム（chosen-ryoiki-group/tokyo/reporthub の issue）   # 問い合わせ先
interfaces:                  # 出している口と、予定している口。無ければ []
  - kind: grpc               # grpc / event
    name: reporthub.hub.v1.ReportReadService      # grpc はサービスの名前。event は subject
    description: 本人の日報の読み取り              # 何が得られるか。1 行
    status: planned          # available（使える）/ planned（予定）
    issue: https://gitlab.com/chosen-ryoiki-group/tokyo/reporthub/-/work_items/1230   # planned のときに書く
```

| 項目 | 必須 | 内容 |
|---|---|---|
| `name` | ○ | 製品名（英小文字・数字・ハイフン） |
| `version` | ○ | 出している定義の版 |
| `contact` | ○ | 問い合わせ先 |
| `interfaces` | | 口の並び。省くと、口なしとして扱う |
| `interfaces[].kind` | ○ | `grpc` か `event` |
| `interfaces[].name` | ○ | gRPC はサービスの名前（`<パッケージ>.<サービス>`）。イベントは subject（`events.<製品名>.<ドメイン>.<出来事>`） |
| `interfaces[].description` | ○ | 説明。1 行 |
| `interfaces[].status` | ○ | `available` か `planned` |
| `interfaces[].issue` | | 予定を追う issue の URL。`planned` のときに書く |

書式に合わないときは、その Hub の前回の内容が一覧に残り、一覧の「集めた結果」に理由が出る。直して既定のブランチに入れると、次の実行で入る。

## README.md

読む人は、ほかの Hub の開発者と Claude Code。次の順で書く。

1. 何を、誰向けに出しているか（2〜3 行）
2. 出している口: gRPC はサービスごとにメソッドの一覧（入力・出力・エラーの要点）と接続先（サービス名とポート）。イベントは subject ごとに、出るときと中身
3. 予定している口: 何を出す予定か、issue の URL
4. 使う側が守ること（テナントの渡し方、上限、呼んではいけない場面）
5. 使い始める手順（通信を開ける MR の出し先、問い合わせ先）

## proto/

- パッケージの名前どおりのディレクトリに置く（例: `proto/reporthub/hub/v1/report_read_service.proto`）。
- ほかの Hub 向けの定義だけを置く。内部用の定義は置かない。
- 生成したコードは置かない。使う側が、自分の言語で作る。

## 版とタグ

出している定義を変えたら、`version` を上げて、Hub のリポジトリにタグ `<製品名>-contract/v<版>` を打つ。互換の規則は、基盤の契約と同じ（`guide/README.md` の §11.4）。

## 集める相手

一覧ファイル（`deploy/applications/hubs/*.yaml`）にある Hub と、[sources.yaml](sources.yaml) にある Hub。新しい Hub は、リポジトリを作った時点で `sources.yaml` に足す MR を出す。

## 集めるジョブ

基盤のリポジトリの CI のジョブ `catalog:hub-contracts`（`scripts/collect-hub-contracts.sh`）。写しか一覧に差があれば `main` に commit する。

| きっかけ | 内容 |
|---|---|
| 定期実行 | 1 日 1 回。GitLab の「ビルド → パイプラインスケジュール」に登録してある（対象のブランチ `main`、cron `0 6 * * *`、タイムゾーン Asia/Tokyo）。登録した人の権限で `main` に push するので、Maintainer 以上が登録する |
| 手動 | 「パイプラインスケジュール」の実行ボタン。または「ビルド → パイプライン → 新しいパイプライン」で `main` を選ぶ |
| Hub のマージ | Hub の CI に、ひな形 `.hub_contract_notify` を使うジョブがあれば、既定のブランチで `contract-out/` が変わったときに起動する。マージした人が、基盤のリポジトリの `main` でパイプラインを動かせる（Maintainer 以上）ときだけ通る。通らないときは、定期実行で入る |

Hub のリポジトリを読む方法:

- CI の一時的なトークン（`CI_JOB_TOKEN`）で読む。各 Hub のリポジトリの「設定 → CI/CD → ジョブトークンの権限」の許可リストに、基盤のリポジトリ（`chosen-ryoiki-group/hamburg/hub-platform`）を足しておく（Hub ごとに 1 回。秘密情報は作らない）。パイプラインを動かした人が、その Hub のリポジトリを読めることも要る。
- CI/CD の変数 `HUB_READ_TOKEN` があれば、そちらで読む（`read_repository` のグループアクセストークン）。

## 集めた結果

一覧のページの「集めた結果」の表に、集める相手の全部が、最後の実行での状態で載る。Hub の側ですることは、その表の行に出る。

| 状態 | 意味 |
|---|---|
| 読めた | 載っているのは、今の `contract-out/` の内容 |
| 読めない | リポジトリを取れなかった。前回の内容を載せたままにする。git の失敗の文は、集めるジョブのログに出る |
| `contract-out/` が無い | 既定のブランチに `contract-out/` が無い。一覧には何も載らない |
| 書式に合わない | `hub.yaml` が無い・書式に合わない・上限を超えた（理由を表に出す）。前回の内容を載せたままにする |

- 前回の内容を載せている Hub は、一覧のほかの表で、名前に `※` が付く。
- 「内容を読めた日」（日本時間）は、内容が変わった日か、読めるようになった日。変わらない間は進まない（毎日の実行で commit を増やさないため）。元は `status.tsv`（ジョブが書く。手で直さない）。
