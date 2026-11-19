# 枠の決まり（ヘッダ・左のナビ・本体）

どの Hub の画面も、同じ枠に入っているように見せるための決まり。寸法と色は `tokens.css` の変数で書く。素の HTML + CSS で組んだ実物は `example.html`。

- 共通なのは「見た目の決まり」。ヘッダやナビに何を置くかは、下の表で「製品ごと」としたものは各 Hub が決める。
- 枠を作る部品（共通のヘッダなど）は配っていない。各 Hub が、自分の枠組みで、この決まりどおりに作る。

---

## 1. 全体

```
┌──────────────────────────────────────────────────────────────────────┐
│ [印] 製品の名前        （ 製品ごとの場所 ）      （製品ごと） (本人) │ ヘッダ 60px
├────┬─────────────────────────────────────────────────────────────────┤
│ ■  │                                                                 │
│ □  │   本体（ここだけが縦に動く）                                    │
│ □  │   ┌───────────────────────────────────────────┐                 │
│ □  │   │ 中身。最大の幅を決めて、中央に寄せる      │                 │
│    │   └───────────────────────────────────────────┘                 │
└────┴─────────────────────────────────────────────────────────────────┘
 左のナビ 56px                                 （幅 1024px 未満では、左のナビの代わりに下のナビ）
```

| 項目 | 決まり |
|---|---|
| 高さ | 画面いっぱい（`100dvh`）。ヘッダと左のナビは動かず、本体だけが縦に動く |
| 地の色 | `--hub-color-bg` |
| 並び | 上にヘッダ。その下を、左のナビ（固定の幅）と本体（残り全部）に分ける |
| 画面の幅の区切り | 640px / 768px / 1024px（`--hub-breakpoint-sm` / `-md` / `-lg`） |

## 2. ヘッダ

### 2.1 見た目（共通）

| 項目 | 決まり |
|---|---|
| 高さ | `--hub-header-height`（60px）。変えない（§6） |
| 地と区切り | 地は `--hub-color-surface`。下に 1px の線 `--hub-color-line`。影は付けない |
| 位置 | 画面の上に固定。重なりの順は `--hub-z-header` |
| 左右の余白 | `--hub-header-padding-x`（16px）。幅 640px 以上は `--hub-header-padding-x-wide`（24px） |
| 並べ方 | 横 1 列、縦は中央ぞろえ。左・中央・右の 3 つのかたまり。かたまりの間は `--hub-header-gap`、右のかたまりの中は `--hub-header-item-gap` |
| 中央のかたまり | 残りの幅を取り、中身を中央に寄せる。幅 768px 未満では出さない（右のかたまりを右端に寄せる） |
| 製品の印 | `--hub-header-mark-size`（26px）四方、角 `--hub-radius-lg`。地は `--hub-color-primary-600` から `--hub-color-primary-700` への斜めのグラデーション。中に白の太字 1 文字（`--hub-header-mark-text`） |
| 製品の名前 | `--hub-text-lg`、太さ `--hub-weight-bold`、字間 `--hub-tracking-tight`、色 `--hub-color-ink`。印との間は `--hub-space-2` |
| 丸いボタン（通知など） | アイコン `--hub-icon-size`（20px）を、`--hub-header-icon-button`（36px）四方の中央に置く。色 `--hub-color-text-muted`。ホバーで地が `--hub-color-frame-hover`、角 `--hub-radius-md` |
| 件数の丸 | 丸いボタンの右上。地 `--hub-color-badge-dot`、白の太字 9px、高さ 14px。99 を超えたら「99+」 |
| 主ボタン（置く場合） | 高さ `--hub-header-action-height`（38px）、角 `--hub-radius-header-action`、地 `--hub-color-primary`（ホバーで `--hub-color-primary-hover`）、白の文字 `--hub-text-sm` / `--hub-weight-semibold`、影 `--hub-shadow-sm`。左にアイコン `--hub-icon-size-sm`。幅 1024px 未満では出さない |
| 検索（置く場合） | 中央のかたまりに置く。最大の幅 `--hub-header-search-max`。地 `--hub-color-surface-subtle`、枠 `--hub-color-border`、角 `--hub-radius-lg`、文字 `--hub-text-sm`。左に虫めがね（`--hub-icon-size-sm`、色 `--hub-color-text-placeholder`）。フォーカスで地が `--hub-color-surface`、枠と輪が `--hub-color-focus` |
| 本人の丸 | `--hub-header-avatar`（32px）の丸。画像が無いときは、色の地に白の太字の頭文字（`--hub-text-sm`） |
| 本人のメニュー | 丸を押すと、右端ぞろえで下に開く。幅 `--hub-menu-width`、地 `--hub-color-surface`、枠 `--hub-color-border`、角 `--hub-radius-md`、影 `--hub-shadow-lg`、重なりの順 `--hub-z-dropdown`。項目は `--hub-text-sm` / `--hub-color-text`、余白は縦 `--hub-space-2`・横 `--hub-space-3`、ホバーで地が `--hub-color-surface-subtle`。いちばん上に本人のメール（`--hub-text-xs` / `--hub-color-text-muted`、下に線 `--hub-color-border-subtle`）。外を押すか Esc で閉じる |
| フォーカス | キーボードで移ったときだけ、2px の輪 `--hub-color-focus` を、2px 離して出す |

### 2.2 中身（共通のものと、製品ごとのもの）

| 場所 | 中身 | 共通か |
|---|---|---|
| 左 | 製品の印と名前。押すと、その製品の最初の画面へ | **共通**（場所と見た目。印の文字と名前は製品のもの）。製品の切り替えは、ここに置く。今は、製品の名前を出すだけ |
| 右端 | 本人の丸と、本人のメニュー | **共通**（場所と見た目）。メニューには「ログアウト」を必ず入れる。ほかの項目は製品ごと |
| 中央 | 検索など | 製品ごと。置かなくてもよい |
| 右（本人の丸の手前） | 通知、主ボタン（新しく作る、など）、その製品の案内 | 製品ごと。置かなくてもよい。置くときは §2.1 の見た目で、右から「本人の丸 → 通知 → 主ボタン」の順 |

- 幅 1024px 未満では、主ボタンを出さない。幅 768px 未満では、中央のかたまりを出さない。
- ログアウトは、基盤の `POST /api/v1/auth/logout` を呼んでから `/login` へ移る（Reporthub の今の動き）。

## 3. 左のナビ

### 3.1 見た目（共通）

| 項目 | 決まり |
|---|---|
| 幅 | `--hub-nav-width`（56px）。アイコンだけを縦に並べる。開閉しない |
| 地と区切り | 地は `--hub-color-surface`。右に 1px の線 `--hub-color-line` |
| 内側の余白 | 上下 `--hub-nav-padding-y`、左右 `--hub-nav-padding-x`。項目の間は `--hub-nav-gap` |
| 項目 | `--hub-nav-item-size`（40px）四方、角 `--hub-radius-nav-item`。中央にアイコン 1 つ |
| アイコン | `--hub-icon-size`（20px）。線だけの絵（塗らない）。線の太さ `--hub-icon-stroke`（24 × 24 の枠に対して 1.5）、線の端と角は丸 |
| 名前 | 文字は出さない。項目に `aria-label` と `title` で付ける |
| 未読の点 | 項目の右上（上と右から `--hub-space-1-5`）。`--hub-nav-dot-size`（8px）の丸、色 `--hub-color-badge-dot`、まわりに 2px の `--hub-color-surface` の縁 |

状態:

| 状態 | 地 | アイコンの色 |
|---|---|---|
| 通常 | なし | `--hub-color-ink-2` |
| ホバー | `--hub-color-frame-hover` | `--hub-color-ink-2` |
| 選択中 | `--hub-color-selected-bg` | `--hub-color-selected-text` |
| 無効 | 項目そのものを出さない（権限が無い項目、使えない機能） | — |

- 色の変わり目は `--hub-duration` / `--hub-ease`。
- 選択中は 1 つだけ。今の画面の項目に `aria-current="page"` を付ける。

### 3.2 中身（製品ごと）

項目（どの画面を、どの順で、どのアイコンで出すか）は、製品ごとに決める。区切りの線や見出しは入れない（Reporthub は、項目を上から詰めて並べるだけ）。

## 4. 本体

| 項目 | 決まり |
|---|---|
| 動き | 縦に動くのは本体だけ |
| 中身の幅 | 最大の幅を決めて、中央に寄せる。画面の種類で選ぶ（下の表） |
| 余白 | 左右 `--hub-content-padding-x`（16px。幅 640px 以上は `--hub-content-padding-x-wide` = 24px）、上下 `--hub-content-padding-y`（24px） |
| ページの題 | 本体のいちばん上。題（`--hub-text-2xl` / `--hub-weight-bold` / `--hub-tracking-tight` / `--hub-color-text-heading`）、その下に説明（`--hub-text-sm` / `--hub-color-text-muted`）、右に主な操作。下に `--hub-space-6` 空ける。幅 640px 未満では、操作を題の下に回す |
| かたまりの間 | カードとカードの間は `--hub-space-4`、節と節の間は `--hub-space-6` |

| 最大の幅 | 変数 | Reporthub での使いどころ |
|---|---|---|
| 768px | `--hub-content-max-reading` | 一覧、詳細、マイページ、通知、検索 |
| 896px | `--hub-content-max-form` | プロフィール、最初の設定の手順 |
| 1152px | `--hub-content-max-wide` | 管理の画面 |
| 1280px | `--hub-content-max-full` | ダッシュボード |

色・文字・余白・角の丸み・影の決まりは `components.md`。本体に何を置くかは、製品ごとに決める。

## 5. 狭い画面（幅 1024px 未満）

| 項目 | 決まり |
|---|---|
| 左のナビ | 出さない |
| 下のナビ | 画面の下に固定。高さ `--hub-bottom-nav-height`（56px）、地 `--hub-color-surface`、上に 1px の線 `--hub-color-border`、重なりの順 `--hub-z-bottom-nav`。項目を等しい幅で横に並べる（4 つか 5 つ） |
| 下のナビの項目 | 上にアイコン（`--hub-icon-size`）、下に名前（`--hub-text-2xs`）。間は `--hub-space-0-5`。通常は `--hub-color-text-muted`、選択中は `--hub-color-selected-text`（地は変えない） |
| 本体 | 下のナビに隠れないよう、下に `--hub-bottom-nav-clearance` 空ける |
| ヘッダ | 主ボタンを出さない。幅 768px 未満では、中央のかたまりも出さない |

下のナビに出す項目は製品ごと（左のナビの中から、よく使うものを選ぶ）。

## 6. デスクトップ版の殻の中で開いたとき

デスクトップ版（ガイド §14）は、窓の題の帯を出さず、ヘッダがその代わりをする。窓のボタン（最小化・最大化・閉じる）がヘッダの右端に重なるので、殻が、ヘッダの右を空け、ヘッダをつかんで窓を動かせるようにする。画面は、殻の中かどうかを見分けない（殻のための CSS もコードも書かない）。守るのは次だけ。

| 項目 | 決まり |
|---|---|
| ヘッダの目印 | ヘッダの要素に class `hub-header` を付ける。殻は、この目印の要素だけに効かせる |
| ヘッダの高さ | `--hub-header-height`（60px）で固定。殻が窓のボタンを描く帯の高さ（60px）と同じ値で、ずれるとボタンとヘッダが合わなくなる |
| ヘッダの地 | `--hub-color-surface`（白）。殻が窓のボタンの地を白で描く |
| ヘッダの中の押せるもの | リンク・ボタン・入力欄（`a` / `button` / `input` / `select` / `textarea`）か、`role="button"`・`tabindex` を付けた要素で作る。殻は、これらだけを「つかむ場所」から外す（クリックを付けただけの `div` は押せなくなる） |
| 窓の大きさ | 最初は 1280 × 800。利用者が変えられる（最小の大きさは決まっていない）。画面は 1366 × 768 で崩れないことを目安に確かめる |

- ブラウザで開いたときは、何も変わらない。ヘッダの右の余白は §2.1 のまま。
- 目印を変える・殻に空けさせない（自分で持つ）ときは、デスクトップ版の製品設定の `titlebarSelector`（基盤のリポジトリの `desktop/shell/README.md`）。
