---
name: hub-add-route
description: Hub にサービスや経路（画面・API・認証なしの公開の経路）を足す・変える。配布の設定（deploy/values*.yaml）、手元の設定（dev/devkit.yaml、docker-compose.yml）、基盤の一覧ファイルに出す内容をそろえるときに使う。
---

# サービス・経路を足す

## 読む資料

- `contract/guide.md` §6.1（設定ファイル）、§6.2（一覧ファイルの `routes`）、§6.3（パスの決まり）、公開の経路は §3.5
- `contract/deploy-values.md` の「書式」（サービスに書ける項目）
- `.devkit/README.md` の「設定（`dev/devkit.yaml`）」（無ければ `scripts/devkit.sh update` で取り込む）

## 手順

1. 製品名とパスの接頭辞を、`CLAUDE.md` の「この Hub の決まり」で確かめる。足すパスが接頭辞の下にあることを確かめる。
2. サービスを足すとき:
   - `deploy/values.yaml` の `services` に足し、`deploy/values-dev.yaml` / `deploy/values-prod.yaml` に環境ごとの項目を足す
   - `.gitlab-ci.yml` に、イメージを作るジョブと、タグを書き換えるジョブの `TAG_KEYS`（dev と prod の両方）を足す
   - `docker-compose.yml` に、同じ名前・同じポートのサービスを足す
3. 経路を足すとき:
   - `dev/devkit.yaml` の `routes` に足す（`upstream` は `docker-compose.yml` のサービス名とポート）
   - 基盤の一覧ファイルの `routes` に足す内容（`path` / `service` / `port`、公開なら `public: true`）を、dev と prod の分で書き出す。`hub-list-example.yaml` があれば、同じ内容にする
4. 公開の経路（`public: true`）にするのは、身元もテナントのデータも要らないものだけ（§3.5）。
5. 一覧ファイルは基盤のリポジトリにある。手順 3 で書き出した内容を人に渡し、MR を出してもらう。マージされるまで、クラスタでは新しい経路に届かない（§10）。
6. スキル `hub-local-check` で、足した経路を手元で通して確かめる。

## 確かめること

- 同じ経路が、`dev/devkit.yaml` と、一覧ファイルに出す内容とで、パス・サービス名・ポート・公開かどうかまで一致している
- サービス名とポートが、`deploy/values.yaml`・`docker-compose.yml`・`.gitlab-ci.yml` の `TAG_KEYS` で一致している
- 手元で、足した経路が期待どおりに応答する（認証ありは未ログインで画面の経路がログインの画面へ移り、API の経路が 401、公開はログインなしで通る）
- 一覧ファイルの変更が要ることを、足す内容つきで人に伝えた
