---
name: hub-local-check
description: 手元で hub-devkit を起動し、ログイン・401・403・CSRF・自分の API まで通して確かめ、終わったら止める。画面や API を変えた後の動作確認や、「手元で動かして」「devkit で確かめて」と言われたときに使う。
---

# 手元で通して確かめる

## 読む資料

- `contract/guide.md` §9.1（devkit の中身と、決まったデータの ID）、§3.3（入口が返す応答）
- 起動した後の `.devkit/README.md` の「入口がすること」（ログインと CSRF の curl の例、`/_devkit` の見方）、「偽の基盤（gRPC）がすること」、「本物との違い」

## 手順

1. 製品名とパス（画面・API）を、`CLAUDE.md` の「この Hub の決まり」で確かめる。入口の経路は `dev/devkit.yaml` の `routes`。
2. 起動する: `scripts/devkit.sh up -d --wait`。ポートが当たって起動できないときは、`.devkit/README.md` の「コマンド」の表の変数を `.env` に書く（`.env` はコミットしない）。
3. ログインせずに自分の API を呼ぶ。401 が返る。
4. 「入口がすること」の curl の例のとおりに、テナント `local-dev` の利用者でログインする（Cookie はファイルに取る）。変えた画面・API を呼び、期待した内容が返ることを見る。
5. 書き込み系（POST / PUT / PATCH / DELETE）は、`X-CSRF-Token` なしで 403、付けて通ることを見る。
6. 製品が有効でないテナント `no-hub` の利用者（ID は `.devkit/internal/fixture/default.yaml`）でログインし直して呼ぶ。403 が返る。
7. 通知・LLM を呼ぶ変更のときは、`/_devkit` で、受けた通知と LLM の動きの切り替え（エラーのときの動き）を見る。
8. 期待と違うときは、アプリのログ（`docker compose logs <サービス名>`）と、`contract/guide.md` §10 の表を見る。401 / 403 は、アプリのコードより先に入口の側を確かめる。
9. 止める: `scripts/devkit.sh down`。Cookie のファイルを消す。

## 確かめること

- 手順 3〜6 の応答（401、内容つきの成功、CSRF なしの 403、`no-hub` の 403）を、実際のステータスで報告できる
- 確かめるために、アプリのコード・`.devkit/` を書き換えていない
- devkit を止めた（`docker compose ps` に残っていない）
