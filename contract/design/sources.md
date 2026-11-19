# 変数の出どころ

`tokens.css` の変数が、Reporthub のコード（`tokyo/reporthub` の `pgm/frontend/src`）のどこから来たかの表。値を直すときに使う（`README.md` の「値を直すとき」）。

- 「class」は Tailwind CSS 4 の class。`gray-200` などの既定の色は、Tailwind 4.2.4 の `theme.css` の値（oklch）に直して `tokens.css` に書いてある。
- パスの省略: `layout/` = `components/organisms/layout/`、`atoms/` = `components/atoms/`、`molecules/` = `components/molecules/`。
- REPET（`features/repet`、`repet-mascot`）は対象外。

## 色

| 変数 | Reporthub の class・値 | 出どころ |
|---|---|---|
| `--hub-color-bg` | `--background` / `bg-[oklch(0.972_0.003_250)]` | `app/globals.css` `:root`、`app/(tenant)/layout.tsx` |
| `--hub-color-surface` | `bg-surface`（`--color-surface`）/ `bg-white` | `app/globals.css` `@theme`、`layout/Header.tsx`、`layout/LeftNav.tsx` |
| `--hub-color-surface-subtle` | `bg-gray-50` | 表の `thead`（`features/admin/components/ai-profile-master/TypeSection.tsx`）、`molecules/FormField.tsx` `disabled:bg-gray-50`、`layout/Header.tsx` メニューの `hover:bg-gray-50` |
| `--hub-color-surface-muted` | `bg-gray-100` | `atoms/Button.tsx` ghost の `hover:bg-gray-100`、`molecules/DashboardEmptyState.tsx` |
| `--hub-color-overlay` | `bg-black/40` | `molecules/Modal.tsx` |
| `--hub-color-ink` `--hub-color-ink-2` `--hub-color-ink-3` | `--color-ink` `--color-ink2` `--color-ink3` | `app/globals.css` `@theme`。`layout/Header.tsx`（`text-ink`、`text-ink2`）、`layout/LeftNav.tsx`（`text-ink2`） |
| `--hub-color-line` `--hub-color-line-2` | `--color-line` `--color-line2` | `app/globals.css` `@theme`。`layout/Header.tsx` `border-line`、`layout/LeftNav.tsx` `border-line`、`molecules/FeedStatusTabs.tsx` `border-line2` |
| `--hub-color-frame-hover` | `hover:bg-[oklch(0.95_0.006_250)]` | `layout/Header.tsx`、`layout/LeftNav.tsx` |
| `--hub-color-text-heading` | `text-gray-900` | `molecules/PageHeader.tsx`、`molecules/StatCard.tsx`、`molecules/Modal.tsx` |
| `--hub-color-text-strong` | `text-gray-800` | `molecules/NodeParticipationList.tsx`、`atoms/ToggleSwitch.tsx` |
| `--hub-color-text` | `text-gray-700` | `atoms/Button.tsx` secondary、`molecules/FormField.tsx` ラベル、`layout/Header.tsx` メニュー |
| `--hub-color-text-sub` | `text-gray-600` | `atoms/Button.tsx` ghost、`molecules/ConfirmDialog.tsx`、表の `td` |
| `--hub-color-text-muted` | `text-gray-500` | `molecules/PageHeader.tsx` 説明、`molecules/StatCard.tsx`、`atoms/EmptyState.tsx`、`molecules/NotificationBell.tsx`、`layout/BottomNav.tsx` |
| `--hub-color-text-placeholder` | `text-gray-400` / `placeholder-gray-400` | `features/search/components/HeaderSearchPanel.tsx`、`atoms/Button.tsx` `disabled:text-gray-400` |
| `--hub-color-text-on-primary` | `text-white` | `atoms/Button.tsx` primary |
| `--hub-color-border` `--hub-color-skeleton` | `border-gray-200` / `bg-gray-200` | `molecules/StatCard.tsx`、`molecules/SkeletonCard.tsx`、`atoms/EmptyState.tsx`、`layout/BottomNav.tsx`、`atoms/Skeleton.tsx`（`bg-gray-200`） |
| `--hub-color-border-strong` | `border-gray-300` | `atoms/Button.tsx` secondary、`molecules/FormField.tsx`、`atoms/NumberField.tsx`、`atoms/ToggleSwitch.tsx`（切の `bg-gray-300`） |
| `--hub-color-border-subtle` | `border-gray-100` / `divide-gray-100` | 表の `tbody`、`layout/Header.tsx` メニューのメールの下 |
| `--hub-color-primary-50` `--hub-color-primary-100` `--hub-color-primary-200` `--hub-color-primary-300` `--hub-color-primary-400` `--hub-color-primary-500` `--hub-color-primary-600` `--hub-color-primary-700` `--hub-color-primary-800` `--hub-color-primary-900` `--hub-color-primary-950` | `--color-primary-*` | `app/globals.css` `@theme` |
| `--hub-color-primary` `--hub-color-primary-hover` `--hub-color-primary-disabled` | `bg-primary-600` `hover:bg-primary-700` `disabled:bg-primary-300` | `atoms/Button.tsx` primary、`layout/Header.tsx` |
| `--hub-color-link` | `text-primary-600 hover:underline` | `features/notification/components/NotificationDropdown.tsx` ほか |
| `--hub-color-focus` | `focus-visible:ring-primary-500` / `focus:border-primary-500` | `layout/Header.tsx`、`molecules/FormField.tsx`、`atoms/Select.tsx` |
| `--hub-color-selected-bg` `--hub-color-selected-text` | `bg-primary-50 text-primary-700` | `layout/LeftNav.tsx` 選択中、`layout/BottomNav.tsx`（`text-primary-700`） |
| `--hub-color-success-bg` `--hub-color-success-text` | `bg-emerald-50 text-emerald-700` | `molecules/StatusBadge.tsx` success |
| `--hub-color-success-border` | `border-emerald-200` | `features/` の成功の囲み（5 か所） |
| `--hub-color-success` | `bg-emerald-600` / `text-emerald-600` | `molecules/ToastItem.tsx` success、`molecules/StatCard.tsx` up |
| `--hub-color-warning-bg` `--hub-color-warning-text` `--hub-color-warning-border` | `bg-amber-50 text-amber-700 border-amber-200` | `molecules/StatusBadge.tsx` warning、`molecules/InlineErrorBanner.tsx` warning、`atoms/ErrorState.tsx` |
| `--hub-color-danger-bg` `--hub-color-danger-text` `--hub-color-danger-border` | `bg-rose-50 text-rose-700 border-rose-200` | `molecules/StatusBadge.tsx` danger、`molecules/InlineErrorBanner.tsx` error、`atoms/ErrorState.tsx` |
| `--hub-color-danger-border-strong` | `disabled:bg-rose-300` | `atoms/Button.tsx` danger（無効）。誤りの枠は 0.17.4 から `--hub-color-danger`（`border-rose-600`） |
| `--hub-color-danger` `--hub-color-danger-hover` | `bg-rose-600 hover:bg-rose-700` / `text-rose-600` | `atoms/Button.tsx` danger、`molecules/ToastItem.tsx` error、`molecules/FormField.tsx` 誤りの文 |
| `--hub-color-required` | `text-rose-500` | `molecules/FormField.tsx` 必須の印 |
| `--hub-color-info-bg` `--hub-color-info-text` | `bg-primary-50 text-primary-700` | `molecules/StatusBadge.tsx` info |
| `--hub-color-neutral-bg` `--hub-color-neutral-text` | `bg-slate-100 text-slate-500` | `molecules/StatusBadge.tsx` neutral |
| `--hub-color-badge-dot` | `bg-red-500` | `layout/LeftNav.tsx` 未読の点、`molecules/NotificationBell.tsx` 件数、`layout/BottomNav.tsx` |
| `--hub-color-toast-bg` | `bg-gray-900` | `molecules/ToastItem.tsx` info |

## 文字・余白・角・影

| 変数 | Reporthub の class・値 | 出どころ |
|---|---|---|
| `--hub-font-sans` | `--font-sans`（Inter、Noto Sans JP。`next/font/google`） | `app/globals.css` `@theme inline`、`app/layout.tsx` |
| `--hub-text-2xl` `--hub-leading-2xl` | `text-2xl` | `molecules/PageHeader.tsx` h1、`molecules/StatCard.tsx` |
| `--hub-text-xl` `--hub-leading-xl` | `text-xl` | `molecules/PageHeader.tsx` h2 |
| `--hub-text-lg` `--hub-leading-lg` | `text-lg` | `layout/Header.tsx` 製品の名前、`molecules/PageHeader.tsx` h3 |
| `--hub-text-base` `--hub-leading-base` | `text-base` | `molecules/Modal.tsx` 題 |
| `--hub-text-sm` `--hub-leading-sm` | `text-sm`（309 か所） | `atoms/Button.tsx`、`molecules/FormField.tsx`、表 |
| `--hub-text-xs` `--hub-leading-xs` | `text-xs`（411 か所） | `molecules/FormField.tsx` ラベル、`molecules/StatusBadge.tsx` |
| `--hub-text-2xs` | `text-[11px]`（108 か所） | `layout/BottomNav.tsx`、`molecules/FormField.tsx` 誤りの文、`atoms/NumberField.tsx` 補足 |
| `--hub-weight-normal` `--hub-weight-medium` `--hub-weight-semibold` `--hub-weight-bold` | `font-normal` `font-medium` `font-semibold` `font-bold` | 全体（medium 276、semibold 163、bold 71、normal 12 か所） |
| `--hub-tracking-tight` `--hub-tracking-wide` | `tracking-tight` / `tracking-wide` | `layout/Header.tsx`、`molecules/PageHeader.tsx` / 表の `thead` |
| `--hub-space-0-5` `--hub-space-1` `--hub-space-1-5` `--hub-space-2` `--hub-space-2-5` `--hub-space-3` `--hub-space-4` `--hub-space-5` `--hub-space-6` `--hub-space-8` `--hub-space-12` | Tailwind の余白の段（`--spacing` = 0.25rem）のうち、使われているもの（`px-4` 169、`py-2` 156、`gap-2` 139、`px-3` 121、`p-5` 41、`py-6` 27、`py-12` 17 か所 ほか） | 全体。`py-8` は `features/system-admin*/` のページ |
| `--hub-radius-sm` | `rounded` | `molecules/StatusBadge.tsx` |
| `--hub-radius-md` | `rounded-md`（123 か所） | `atoms/Button.tsx` sm、`molecules/FormField.tsx`、`layout/Header.tsx` メニュー |
| `--hub-radius-lg` | `rounded-lg`（101 か所） | `atoms/Button.tsx` md / lg、`atoms/Select.tsx`、`molecules/ToastItem.tsx`、`layout/Header.tsx` 製品の印 |
| `--hub-radius-xl` | `rounded-xl`（103 か所） | `molecules/StatCard.tsx`、`molecules/SkeletonCard.tsx`、`atoms/EmptyState.tsx`、表の囲み |
| `--hub-radius-2xl` | `rounded-2xl` | `molecules/Modal.tsx` |
| `--hub-radius-full` | `rounded-full` | `atoms/UserAvatar.tsx`、`molecules/NotificationBell.tsx` |
| `--hub-radius-header-action` | `rounded-ctl`（`--radius-ctl: 9px`） | `layout/Header.tsx` 主ボタン |
| `--hub-radius-nav-item` | `rounded-[13px]` | `layout/LeftNav.tsx` |
| `--hub-shadow-sm` | `shadow-sm`（73 か所） | `atoms/Button.tsx`、`molecules/FormField.tsx`、`molecules/StatCard.tsx` |
| `--hub-shadow-md` | `shadow-md` | `molecules/StatCard.tsx` ホバー |
| `--hub-shadow-lg` | `shadow-lg` | `layout/Header.tsx` メニュー、`molecules/ToastItem.tsx` |
| `--hub-shadow-xl` | `shadow-xl` | `molecules/Modal.tsx` |

## 枠・重なり・動き

| 変数 | Reporthub の class・値 | 出どころ |
|---|---|---|
| `--hub-header-height` | `h-[60px]`。殻の帯の高さ `TITLEBAR_HEIGHT`（60） | `layout/Header.tsx`、基盤の `desktop/shell/main/titlebar.js` |
| `--hub-header-padding-x` `--hub-header-padding-x-wide` `--hub-header-gap` `--hub-header-item-gap` | `px-4 sm:px-6` `gap-4` / 右のかたまり `gap-3` | `layout/Header.tsx` |
| `--hub-header-mark-size` `--hub-header-mark-text` | `h-[26px] w-[26px]` `text-[13px]` | `layout/Header.tsx` |
| `--hub-header-action-height` | `h-[38px]` | `layout/Header.tsx` 主ボタン |
| `--hub-header-icon-button` | `h-9 w-9` | `molecules/NotificationBell.tsx` |
| `--hub-header-avatar` | `h-8 w-8`（size md） | `atoms/UserAvatar.tsx` |
| `--hub-header-search-max` | `max-w-sm`（外側は `max-w-[420px]`） | `features/search/components/HeaderSearchPanel.tsx`、`layout/Header.tsx` |
| `--hub-menu-width` | `w-44` | `layout/Header.tsx` 本人のメニュー |
| `--hub-nav-width` `--hub-nav-padding-y` `--hub-nav-padding-x` `--hub-nav-gap` | `w-14` `py-4` `px-2` `gap-1` | `layout/LeftNav.tsx` |
| `--hub-nav-item-size` `--hub-nav-dot-size` | `h-10 w-10` / `h-2 w-2` | `layout/LeftNav.tsx` |
| `--hub-icon-size` `--hub-icon-stroke` | `h-5 w-5`、`strokeWidth="1.5"`、`viewBox="0 0 24 24"` | `atoms/icons.tsx` |
| `--hub-icon-size-sm` | `h-4 w-4` | `layout/Header.tsx` 主ボタンのアイコン、`features/search/components/HeaderSearchPanel.tsx` |
| `--hub-bottom-nav-height` `--hub-bottom-nav-clearance` | `h-14` / `pb-16 lg:pb-0` | `layout/BottomNav.tsx`、`app/(tenant)/layout.tsx` |
| `--hub-content-padding-x` `--hub-content-padding-x-wide` `--hub-content-padding-y` | `px-4 py-6 sm:px-6` | `views/*.tsx`（17 か所） |
| `--hub-content-max-reading` | `max-w-3xl` | `views/InquiriesPage.tsx` `MyPage.tsx` `NotificationsPage.tsx` `ReportDetailPage.tsx` `SearchPage.tsx` `SharesPage.tsx` |
| `--hub-content-max-form` | `max-w-4xl` | `views/UserProfilePage.tsx` `UserOnboardingPage.tsx` `AdminOnboardingPage.tsx` |
| `--hub-content-max-wide` | `max-w-6xl` | `views/AdminPage.tsx` |
| `--hub-content-max-full` | `max-w-7xl` | `views/DashboardPage.tsx`、`views/AdminPage.tsx`（一部のタブ） |
| `--hub-breakpoint-sm` `--hub-breakpoint-md` `--hub-breakpoint-lg` | `sm:` `md:` `lg:` | `layout/Header.tsx`、`layout/LeftNav.tsx`（`lg:flex`）、`layout/BottomNav.tsx`（`lg:hidden`） |
| `--hub-z-sticky` | `z-10` | 一覧の貼り付く見出し |
| `--hub-z-bottom-nav` `--hub-z-header` `--hub-z-dropdown` `--hub-z-modal` `--hub-z-toast` | `z-20` `z-30` `z-40` `z-50` `z-[60]` | `layout/BottomNav.tsx`、`layout/Header.tsx`、`layout/Header.tsx` メニュー、`molecules/Modal.tsx`、`layout/ToastContainer.tsx` |
| `--hub-duration` `--hub-ease` | `transition`（Tailwind の既定 150ms / `cubic-bezier(0.4, 0, 0.2, 1)`） | `atoms/Button.tsx`、`layout/LeftNav.tsx` |
| `--hub-skeleton-duration` `--hub-skeleton-ease` | `animate-pulse` | `atoms/Skeleton.tsx` |
| `--hub-spinner-duration` | `animate-spin` | `atoms/Button.tsx` loading |

## Reporthub の中で値がそろっていない所

決まりには、多く使われている方（左）を採った。

| 役割 | 決まりにした値 | Reporthub にある別の値 |
|---|---|---|
| 本体の文字と線 | `gray-*`（`text-gray-500` 173、`border-gray-200` 145 か所） | `ink` / `line`（各 20 か所ほど。新しい画面と枠で使う）、`slate-*`（`text-slate-500` 29 か所。ログインの画面など） |
| カードの角 | `rounded-xl` = 12px（103 か所） | `rounded-card` = 14px（数か所）、`rounded-2xl` = 16px |
| カードの影 | `shadow-sm`（73 か所） | `shadow-card`（1 か所） |
| ボタンの角 | `rounded-lg` = 8px（`atoms/Button.tsx`） | `rounded-ctl` = 9px（ヘッダの主ボタンなど 5 か所。ヘッダの主ボタンだけ、変数にした） |
| 入力欄 | `rounded-md` + フォーカスの輪 1px（`molecules/FormField.tsx`） | `rounded-lg` + 輪 4px・薄い色（`atoms/Select.tsx`）、輪の色が `violet-500` の版 |
| 誤りの文の大きさ | `text-[11px]`（`molecules/FormField.tsx`） | `text-xs`（`atoms/NumberField.tsx`） |
| 小さな文字 | 11px（108 か所） | 10px（38）、13px（17）、12px の直書き（14）、15px（7） |
| 無効の見せ方 | 色を薄い段にする（`atoms/Button.tsx`） | `disabled:opacity-50`（17 か所）、`opacity-60`、`opacity-40` |
| 切り替えの入の色 | 決まりにしていない | `bg-sky-500`（`atoms/ToggleSwitch.tsx`。主の色ではない） |
| 下のナビと本人のメニューの線・文字 | `gray-200` / `gray-500` / `gray-700`（コードのまま） | ヘッダと左のナビは `line` / `ink2` |
