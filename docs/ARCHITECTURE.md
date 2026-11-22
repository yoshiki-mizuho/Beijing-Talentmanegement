# アーキテクチャ方針

## 目的

このドキュメントは、タレントマネジメントシステムの初期アーキテクチャ方針を定義するものです。

本システムは、1リポジトリ、1デプロイ単位のNext.jsアプリケーションとして開始します。ただし、内部構造は業務領域ごとに責務を分けるモジュラーモノリス型とします。

## モジュラーモノリスを採用する理由

タレントマネジメントシステムでは、メンバー、スキル、ロール、スキルマップ、監査、AI評価など、業務上の境界が比較的明確です。一方で、初期段階からマイクロサービス化すると、認証、デプロイ、監視、トランザクション、データ整合性の複雑さが先に増えます。

そのため、初期は単一アプリケーションとして開発速度と運用の単純さを保ちながら、内部のモジュール境界を明確にします。将来、外部連携、AI評価ジョブ、CSV取り込みなどを独立させる必要が出た場合にも、分離しやすい構造を目指します。

## モジュール

| モジュール | 主な責務 |
| --- | --- |
| `members` | メンバー情報、部署、所属、プロフィール、メンバー検索 |
| `skills` | スキル定義、カテゴリ、レベル説明、スキル検索 |
| `roles` | ロール定義、必要スキル、必要レベル、ロール達成判定 |
| `skill-map` | メンバーとスキルのマトリクス表示、スキル分布の可視化 |
| `dashboard` | 統計、アクションアイテム、集計カード、全体サマリー |
| `csv-import` | CSV import/export、プレビュー、検証、差分確認、一括登録 |
| `auth` | 基盤の認証ヘッダの受け取り、Memberとの結び付け、権限ロール |
| `audit` | 監査ログ、操作履歴、変更差分、import履歴 |
| `notifications` | スキル申告、承認依頼、承認結果、差し戻し通知 |
| `ai-evaluation` | AI評価、評価結果キャッシュ、再評価、利用ログ、フォールバック |
| `growth` | レベルアップの演出とフィード、バッジ、成長カレンダー、目標ロール、応援、1on1メモ、月の振り返り |
| `explore` | 探す画面、スキルプロフィール、社内チャットへのリンク |
| `team-goals` | マネージャーが決めるチーム目標、進み具合、達成判定 |
| `skill-sheet-template` | Excel ひな形の登録・点検・差し込みと提案用スキルシートの出力 |

## レイヤー構成

各業務モジュールは、原則として以下のレイヤーに分けます。

| レイヤー | 役割 |
| --- | --- |
| `domain` | 業務ルール、エンティティ、値オブジェクト、ドメインサービス |
| `application` | use case、トランザクション境界、入力/出力DTO |
| `infrastructure` | Prisma repository、外部API、永続化、技術詳細 |
| `presentation` | 画面コンポーネント、Server Actions、Route Handlers、フォーム |

モジュールの説明はこの表を正とし、仕組みの説明が要るモジュール（`ai-evaluation`、`audit`）だけ `README.md` を置きます。

小さなモジュールでは全レイヤーを無理に作らず、複雑さが出た時点で分割します。ただし、DBアクセスや外部API呼び出しを画面コンポーネントへ直接置くことは避けます。

空のレイヤーディレクトリは置きません。実際のuse case、業務ルール、永続化、画面補助が必要になった時点で、ディレクトリごと追加します。

## ディレクトリ構成

アプリケーションコードは以下の構成です。

```text
src/
  app/
    talent/       ログイン後の画面と死活確認（/talent、/talent/health）
    api/
      talent/v1/  Route Handlers（/api/talent/v1）
  modules/
    <module>/     上の表のモジュールごとに1つ
      domain/
      application/
      infrastructure/
      presentation/
  shared/
    auth/         画面とナビゲーションの出し分け
    domain/       複数モジュールで使う業務の定義（スキルレベル）
    lib/
    ui/
  server/
    auth/
    db/
    security/     CSP
  proxy.ts        画面リクエストへのCSPとパス情報の設定
prisma/
  schema.prisma
  migrations/
  seed.ts
e2e/              PlaywrightのE2Eテスト
  cleanup/        E2Eで作ったデータを消す処理
  ui-check/       画面撮影（npm run ui:check）
scripts/          検証とデータ掃除のスクリプト
```

配置ルールは以下です。

- 画面ルーティングは `src/app` に置き、業務ロジックは原則として `src/modules/<module>` に置く。
- 画面は `/talent`、Route Handler は `/api/talent/v1` の下だけに置く。Next.js の `basePath` は使わず、静的アセットには `assetPrefix: "/talent"` を使う。
- `src/modules/<module>/domain` はフレームワークやDB実装に依存しない純粋な業務ルールを置く。
- `src/modules/<module>/application` はuse case、DTO、トランザクション境界を置く。
- `src/modules/<module>/infrastructure` はPrisma repository、外部API、永続化の実装詳細を置く。
- `src/modules/<module>/presentation` は該当モジュール専用のフォーム、Server Actions、Route Handlers、画面補助部品を置く。
- `src/shared` は複数モジュールで利用する汎用UI、純粋なユーティリティ、横断DTOに限定する。
- `src/server` はPrisma Client、`X-Auth-*` から身元を解決する境界、セキュリティの検査など、アプリ全体で1つだけ持つサーバー基盤を置く。
- `src/server/platform` は基盤の社員・組織 gRPC をアプリの型で包み、テナント別の短時間キャッシュと、基盤停止を判別できるエラーを提供する。組織一覧では未所属者を列挙できないため、呼び出し本人だけを補い、本人も未所属なら空の木と本人だけを返す。
- 画面に出すメンバーの氏名・メール・所属ノード・アバターは `members/application/member-directory.ts` で Member ID をまとめて解決する。DB の社員情報の写しは使わず、基盤停止時は共通の未設定表示にする。同じリクエストでは React の `cache` と基盤 directory のテナント別キャッシュを使い回す。
- Prisma schemaは `prisma/schema.prisma` の1ファイルで持ち、肥大化した場合に分割方針を再検討する。

### DB のテナント分離

`SkillLevel` と `HubTenant` を除く全モデルは `tenant_id` を持ち、PostgreSQL の RLS で `app.tenant_id` と一致する行だけを読み書きできる。`src/server/db/prisma.ts` は、各クエリまたは対話型トランザクションの先頭で `set_config('app.tenant_id', tenantId, true)` を同じトランザクション内に設定する。画面と API は `X-Auth-Tenant-Id`、seed・E2E・定期処理は `runWithTenant` から tenant ID を渡す。`SkillLevel` は Lv1〜5 の共通かつ読み取り専用の目安、`HubTenant` は入口で受け取ったテナント ID だけを定期実行へ渡す一覧なので、tenant ID と RLS の対象外とする。

## 依存方向

依存方向は以下を基本とします。

```text
presentation -> application -> domain
application -> infrastructure
infrastructure -> domain
```

ルールは以下です。

- `domain` はNext.js、Prisma、React、外部APIへ依存しない。
- `application` はuse caseを表現し、画面やDBの詳細を持たない。
- `infrastructure` はPrismaや外部APIなど技術詳細を閉じ込める。
- `presentation` はUIとリクエスト/レスポンス境界を担当する。
- 他モジュールの `infrastructure` へ直接依存しない。
- モジュール間連携は公開されたuse caseまたはservice経由にする。

## 禁止事項

- 他モジュールのPrisma repositoryを直接呼び出す。
- 画面コンポーネントからPrisma Clientを直接呼び出す。
- `domain` にReact、Next.js、Prismaの型を持ち込む。
- 共有ディレクトリへ業務ロジックを無秩序に置く。
- 汎用化を急ぎ、実際の重複や複雑さがない段階で抽象化を増やす。
- 将来のマイクロサービス化だけを理由に、初期実装を過度に分散させる。
- 全画面で動くレイアウトに重い読み取りを置く、人数に比例するデータを最初の HTML に全部入れる、など。性能で守ることは `docs/PERFORMANCE.md` を正とする。

## 共有コードの扱い

共有コードは、複数モジュールで実際に必要になったものだけを共通化します。

共通化してよいものの例:

- 汎用UIコンポーネント
- 日付、文字列、数値などの純粋なユーティリティ
- 認証済みユーザー取得など横断的なヘルパー
- 共通エラー型
- ページネーションやソートの共通DTO

共通化を避けるものの例:

- 特定モジュール固有の業務判断
- 特定画面専用のフォームロジック
- まだ2箇所以上で使われていない処理

## このドキュメントの位置づけ

モジュールやディレクトリを追加・削除したときは、このドキュメントの表と構成図も同じMerge Requestで更新します。
