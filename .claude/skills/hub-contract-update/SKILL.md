---
name: hub-contract-update
description: 基盤の契約の版を上げる（scripts/update-contract.sh）。CHANGELOG を読んで自分の Hub に要る変更を洗い出し、手元で確かめる。「契約を上げて」「基盤の新しい版を取り込んで」と言われたとき、基盤の新しい口や決まりを使いたいときに使う。
---

# 契約の版を上げる

## 読む資料

- `contract/guide.md` §11（版の形 §11.1、互換の規則 §11.4）
- 取り込んだ後の `contract/CHANGELOG.md`（版ごとの変更の全部）

## 手順

1. 今の版を見る: `contract/VERSION`。作業ツリーに `contract/`・`.claude/skills/hub-*`・`scripts/` の変更が残っていないことを確かめる。
2. 取り込む: `scripts/update-contract.sh <新しい版>`（`0.15.0` の形）。`contract/`、`.claude/skills/hub-*/`、`scripts/` の基盤のスクリプト、`devkit.version` が、その版に揃う（どれも手で直さない）。
3. デスクトップ版を持つ Hub だけ: `desktop/desktop.version` と `desktop/scripts/desktop.sh` も揃っているので、`desktop/scripts/desktop.sh update` で殻を取り込み直す。
4. `contract/CHANGELOG.md` の、今の版より後から新しい版までの行を全部読む。行ごとに「Hub の側ですること」を書き出す。無い行は「なし」と書く。
5. `git diff --stat -- contract .claude/skills scripts` で変わったファイルを見て、次を洗い出す。
   - proto が変わった → コードを作り直す（コマンドは `CLAUDE.md` の「この Hub の決まり」）。使っているメソッド・項目への影響を見る
   - `contract/hub-platform-for-claude.md`・`contract/guide.md` の決まりが変わった → 当たるコードを探して直す
   - `contract/deploy-values.md` が変わった → `deploy/` の設定ファイルを見直す
   - `contract/design/` が変わった → 画面を `contract/design/example.html` と見比べる
6. `CLAUDE.md` の「この Hub の決まり」にあるビルド・テストのコマンドを流し、スキル `hub-local-check` で通して確かめる。
7. `contract/`、`.claude/skills/`、`scripts/`、`devkit.version`（デスクトップ版を持つ Hub は `desktop/` の 2 つも）、直したコードを、1 つの MR にまとめる。

## 確かめること

- `contract/VERSION` と `devkit.version` が新しい版（デスクトップ版を持つ Hub は `desktop/desktop.version` も）
- CHANGELOG の該当の行ごとに、したこと（または「なし」）を報告できる
- ビルド・テストと、手元の確認（`hub-local-check`）が通った
