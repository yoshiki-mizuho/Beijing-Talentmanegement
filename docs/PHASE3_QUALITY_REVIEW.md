# Phase 3 品質レビュー

## レビュー観点

- セキュリティ観点でのレビュー
- 性能面でのレビュー
- クリーンなソースであることのレビュー

## 判定

Phase 3の現在実装は、上記3観点のレビューを通過しています。

## セキュリティレビュー

| 観点 | 判定 | 対応 |
| --- | --- | --- |
| 認証済みユーザーのみ業務画面/APIを利用できる | OK | アプリ領域は `getCurrentSession` による保護、Route Handlersは `authorizeApi` を経由 |
| 更新系操作が権限なしで実行されない | OK | Server ActionsとRoute Handlersに `ADMIN` / `MANAGER` / `MEMBER` の役割に応じたサーバー側ガードを追加 |
| 通知既読化が他人の通知に作用しない | OK | `recipientMemberId` とログイン中 `memberId` の両方で `updateMany` |
| スキル申告レビューを二重処理できない | OK | `PENDING` の申告だけレビュー可能にした |
| 入力値がサーバー側で検証される | OK | application service内のZod schemaでフォーム/API入力を検証 |

## 性能レビュー

| 観点 | 判定 | 対応 |
| --- | --- | --- |
| 不要な関連データを取得していない | OK | スキル一覧は件数のみ `_count` で取得し、通知一覧の未使用includeを削除 |
| ビルド時にDBアクセスしない | OK | DBを読むアプリ画面は `dynamic = "force-dynamic"` を指定済み |
| 達成判定が過度なDB往復をしない | OK | `/roles` はメンバー、ロール、スキルをまとめて取得し、画面内で判定 |
| migration差分がない | OK | `npm.cmd run prisma:migrate:check` で `No difference detected.` を確認 |

## クリーンソースレビュー

| 観点 | 判定 | 対応 |
| --- | --- | --- |
| モジュール境界を守っている | OK | presentationはapplication serviceを呼び、Prismaはinfrastructure層へ集約 |
| 認可処理が散らばっていない | OK | `src/server/auth/authorization.ts` に認可ヘルパーを集約 |
| 型チェックとlintが通る | OK | `npm.cmd run typecheck` と `npm.cmd run lint` が成功 |
| テストが通る | OK | `npm.cmd run test` が成功 |
| 不要な空白や差分異常がない | OK | `git diff --check` が成功 |

## 確認コマンド

| コマンド | 結果 |
| --- | --- |
| `npm.cmd run typecheck` | OK |
| `npm.cmd run test` | OK |
| `npm.cmd run lint` | OK |
| `npm.cmd run build` | OK |
| `npm.cmd run prisma:migrate:check` | OK |
| `git diff --check` | OK |
