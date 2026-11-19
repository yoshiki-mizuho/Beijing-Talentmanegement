# 基本の部品の見た目

本体に置く基本の部品の見た目を、`tokens.css` の変数で書いたもの。部品そのものは配っていない。各 Hub が、自分の枠組みで作る。素の HTML + CSS の見本は `example.html`（`<style>` の「ボタン」「入力欄」などの見出しの下。class の名前は例で、写して使ってよい）。

共通の約束:

- 文字の基本は `--hub-font-sans`、`--hub-text-sm`（14px）。行の高さは、大きさと組の `--hub-leading-*`。
- 色の変わり目は `--hub-duration` / `--hub-ease`。
- 無効のときは、色を薄くするだけ。マウスの形は変えない（押せる部品だけ、指の形にする）。
- フォーカスの輪の色は `--hub-color-focus`。

---

## 1. ボタン

| 種類 | 地 | 文字 | 枠・影 | ホバー | 無効 |
|---|---|---|---|---|---|
| 主（その画面で 1 番の操作） | `--hub-color-primary` | 白 | 影 `--hub-shadow-sm` | 地 `--hub-color-primary-hover` | 地 `--hub-color-primary-disabled` |
| 副 | `--hub-color-surface` | `--hub-color-text` | 枠 `--hub-color-border-strong`、影 `--hub-shadow-sm` | 地 `--hub-color-surface-subtle` | 文字 `--hub-color-text-placeholder` |
| 文字だけ | なし | `--hub-color-text-sub` | なし | 地 `--hub-color-surface-muted` | 文字 `--hub-color-text-placeholder` |
| 危険（消す、など） | `--hub-color-danger` | 白 | 影 `--hub-shadow-sm` | 地 `--hub-color-danger-hover` | 地 `--hub-color-danger-border-strong` |

| 大きさ | 高さ | 左右の余白 | 文字 | 角 |
|---|---|---|---|---|
| 小 | 32px | `--hub-space-3` | `--hub-text-xs` | `--hub-radius-md` |
| 中（基本） | 40px | `--hub-space-4` | `--hub-text-sm` | `--hub-radius-lg` |
| 大 | 44px | `--hub-space-5` | `--hub-text-sm` | `--hub-radius-lg` |

- 太さは `--hub-weight-medium`。アイコンと文字の間は `--hub-space-1-5`。
- 処理中は、ボタンを無効にして、文字の左に小さな輪（12px、線 2px、文字と同じ色、1 か所が欠けた輪が `--hub-spinner-duration` で 1 回転）を出す。

## 2. 入力欄

| 項目 | 決まり |
|---|---|
| ラベル | 欄の上。`--hub-text-xs` / `--hub-weight-medium` / `--hub-color-text`。必須の印は、ラベルの後ろに「*」（`--hub-color-required`） |
| 欄 | 幅いっぱい。余白は縦 `--hub-space-2`・横 `--hub-space-3`。枠 `--hub-color-border-strong`、角 `--hub-radius-md`、影 `--hub-shadow-sm`、文字 `--hub-text-sm`。ラベルとの間は `--hub-space-1` |
| 入力例 | `--hub-color-text-placeholder` |
| フォーカス | 枠が `--hub-color-focus`、その外に同じ色の 1px の輪 |
| 無効 | 地 `--hub-color-surface-subtle` |
| 誤り | 枠が `--hub-color-danger`（白との比 3:1 以上）。欄の下に文（`--hub-text-2xs` / `--hub-color-danger`、`role="alert"`） |
| 補足 | 欄の下。`--hub-text-2xs` / `--hub-color-text-muted` |
| 選ぶ欄（select） | 角 `--hub-radius-lg`、枠 `--hub-color-border-strong`、余白は縦 `--hub-space-2-5`・横 `--hub-space-4`。フォーカスは枠 `--hub-color-focus` |
| 切り替え（スイッチ） | 幅 36px・高さ 20px の丸い帯に、16px の白い丸。切は帯が `--hub-color-border-strong`、無効は全体を薄くする |

## 3. カード

| 項目 | 決まり |
|---|---|
| 面 | 地 `--hub-color-surface`、枠 `--hub-color-border`、角 `--hub-radius-xl`、影 `--hub-shadow-sm` |
| 内側の余白 | `--hub-space-5`。数字を見せる小さなカードは `--hub-space-4` |
| 数字を見せるカード | 上に名前（`--hub-text-xs` / `--hub-weight-medium` / `--hub-color-text-muted`）、下に数字（`--hub-text-2xl` / `--hub-weight-bold` / `--hub-color-text-heading`）、その下に補足（`--hub-text-xs` / `--hub-color-text-muted`）。増えたは `--hub-color-success`、減ったは `--hub-color-danger` |
| カードの中の題 | `--hub-text-sm` / `--hub-weight-semibold` / `--hub-color-text-heading` |

## 4. バッジ

| 種類 | 地 | 文字 |
|---|---|---|
| 成功 | `--hub-color-success-bg` | `--hub-color-success-text` |
| 注意 | `--hub-color-warning-bg` | `--hub-color-warning-text` |
| 危険 | `--hub-color-danger-bg` | `--hub-color-danger-text` |
| 情報 | `--hub-color-info-bg` | `--hub-color-info-text` |
| 中立 | `--hub-color-neutral-bg` | `--hub-color-neutral-text` |

- 形: 余白は縦 `--hub-space-0-5`・横 `--hub-space-2`、角 `--hub-radius-sm`、`--hub-text-xs` / `--hub-weight-medium`。枠は付けない。
- 未読や新着の印は、文字のバッジではなく、小さな点（8px、`--hub-color-badge-dot`）か、件数の丸（`layout.md` §2.1）で出す。

## 5. 表

| 項目 | 決まり |
|---|---|
| 囲み | カードと同じ面（枠 `--hub-color-border`、角 `--hub-radius-xl`、影 `--hub-shadow-sm`）。内側の余白は無し。はみ出しは隠す |
| 見出しの行 | 地 `--hub-color-surface-subtle`、`--hub-text-xs` / `--hub-weight-medium` / `--hub-color-text-muted`、字間 `--hub-tracking-wide`、英字は大文字。余白は縦 `--hub-space-2`・横 `--hub-space-4`。下に線 `--hub-color-border` |
| 中身の行 | `--hub-text-sm`。余白は縦 `--hub-space-3`・横 `--hub-space-4`。行の間に線 `--hub-color-border-subtle`。値は `--hub-color-text-sub`、名前の列は `--hub-weight-medium` / `--hub-color-text-heading` |
| そろえ | 文字は左。操作の列は右 |
| 行が無いとき | 表の中に 1 行で「ありません」の文（中央、縦 `--hub-space-12`、`--hub-text-sm` / `--hub-color-text-muted`） |

## 6. 空の状態

| 項目 | 決まり |
|---|---|
| 面 | 地 `--hub-color-surface`、**点線**の枠 `--hub-color-border`、角 `--hub-radius-xl`。影は付けない |
| 中身 | 中央ぞろえ。上下 `--hub-space-12`。題（`--hub-text-sm` / `--hub-weight-semibold` / `--hub-color-text`）、その下に説明（`--hub-text-sm` / `--hub-color-text-muted`）。次の操作があれば、下に小さい主ボタン |
| 取れなかったとき | 同じ形で、枠・地・文字を危険の色（`--hub-color-danger-border` / `--hub-color-danger-bg` / `--hub-color-danger-text`）にする。注意は、注意の色 |

## 7. 読み込み中

| 項目 | 決まり |
|---|---|
| 形 | 中身が入る場所に、同じ大きさの帯を置く（スケルトン）。文字の帯は高さ 16px・角 `--hub-radius-md`、丸いものは丸 |
| 色と動き | 地 `--hub-color-skeleton`。濃さが 100% → 50% → 100% と、`--hub-skeleton-duration` で 1 回、ゆっくり変わる（`--hub-skeleton-ease`） |
| ボタンの処理中 | §1 の小さな輪 |

## 8. トースト・画面の中の知らせ

**トースト**（操作の結果を、少しの間だけ出す）

| 項目 | 決まり |
|---|---|
| 場所 | 画面の右下。右と下から `--hub-space-6`。重なりの順 `--hub-z-toast`。複数は縦に並べ、間は `--hub-space-2` |
| 形 | 余白は縦 `--hub-space-2`・横 `--hub-space-4`、角 `--hub-radius-lg`、影 `--hub-shadow-lg`、白の文字 `--hub-text-sm`。幅は 360px まで |
| 色 | お知らせ `--hub-color-toast-bg`、成功 `--hub-color-success-text`、失敗 `--hub-color-danger-text`（どれも白い文字との比 4.5:1 以上） |

**画面の中の知らせ**（その場所に出し続ける誤り・注意）

| 項目 | 決まり |
|---|---|
| 形 | 余白は縦 `--hub-space-2`・横 `--hub-space-3`、角 `--hub-radius-md`、1px の枠、`--hub-text-xs`。題は `--hub-weight-semibold` |
| 色 | 誤りは `--hub-color-danger-border` / `--hub-color-danger-bg` / `--hub-color-danger-text`。注意は `--hub-color-warning-border` / `--hub-color-warning-bg` / `--hub-color-warning-text` |

## 9. ダイアログ

| 項目 | 決まり |
|---|---|
| 後ろ | 画面全体を `--hub-color-overlay` で覆う。重なりの順 `--hub-z-modal` |
| 面 | 地 `--hub-color-surface`、角 `--hub-radius-2xl`、影 `--hub-shadow-xl`。上から `--hub-space-6` 空けて、横は中央 |
| 題の帯 | 余白は縦 `--hub-space-3`・横 `--hub-space-5`、下に線 `--hub-color-border`。題は `--hub-text-base` / `--hub-weight-semibold` / `--hub-color-text-heading`。右に閉じるボタン |
| 中身 | 余白 `--hub-space-5`。確かめの文は `--hub-text-sm` / `--hub-color-text-sub`。ボタンは右下に寄せ、間は `--hub-space-2`（右が主） |
