---
name: hub-desktop
description: Hub のデスクトップ版（Windows のアプリ）を作り始める・確かめる。desktop/ が無い Hub でデスクトップ版を出したいとき、アプリの名前やアイコンを変えるときに使う。
---

# デスクトップ版を作る

## 読む資料

- `contract/guide.md` §14（持ち分、通知、画面が守ること）
- 取り込んだ殻の `desktop/.desktop-shell/README.md`（置かれるものの表）

## 手順

1. 製品名・パスの接頭辞・アプリの名前を、`CLAUDE.md` の「この Hub の決まり」で確かめる。
2. `scripts/update-contract.sh <今の版> --desktop`（版は `contract/VERSION`）。古いスクリプトが `--desktop` を受けないときは、先に `--desktop` なしで 1 回流してから、もう一度付けて流す。
3. `desktop/scripts/desktop.sh init <製品名> /<接頭辞> <アプリの名前>`。殻の取り込み、製品設定、仮のアイコン、`deploy/values*.yaml` の `desktop:` まで置かれる。
4. 画面のヘッダに class `hub-header` があり、高さが 60px であることを確かめる（`contract/design/layout.md` §6）。
5. 手元で `desktop/scripts/desktop.sh build dev --dir`（Node.js が要る。初回は `cd desktop && npm install`）。`desktop/dist/dev/win-unpacked/` の exe を起動して、最初に開くパスが出ることを人に確かめてもらう。
6. 一覧ファイルに `desktop: true` を足す必要があることを、人に伝える（基盤のリポジトリ。基盤の担当がマージする）。
7. `desktop/` と `deploy/values*.yaml` を 1 つの MR にする。`.desktop-shell/` と `dist/` はコミットしない（`.gitignore` に入る）。

## 確かめること

- `desktop/product.config.js` の `productName` がアプリの名前で、接続先が `http://dev.reporthub.internal/<接頭辞>`
- `deploy/values.yaml` に `desktop.image`、`values-dev.yaml` と `values-prod.yaml` に `desktop.tag` がある
- `.gitlab-ci.yml` にデスクトップ版のジョブを書いていない（基盤のひな形の `hub:desktop:*` が動く）
- アイコンを差し替えたなら、`desktop/assets/` の 3 つの名前が変わっていない
- 入れ済みのアプリに届けたい変更なら、`desktop/package.json` の `version` を上げた（上げないと、入れ済みのアプリは更新されない）
