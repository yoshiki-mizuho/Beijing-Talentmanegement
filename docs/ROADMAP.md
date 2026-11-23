# 開発ロードマップ

## 目的

このドキュメントは、タレントマネジメントシステムをMVPから本番運用可能な新システムへ発展させるための開発ロードマップを整理するものです。

技術方針は `docs/TECH_STACK.md` を前提とし、新システムは `Next.js 16系 App Router + PostgreSQL + Prisma + Auth.js + GitLab CI/CD` を中心に構築します。

## 前提

- MVPは `Next.js + TypeScript + Tailwind CSS + localStorage` で構築済み。
- MVPにはメンバー管理、スキル管理、ロール管理、スキル検索、スキルマップ、統計ダッシュボード、AI評価の基本機能がある。
- 新システムでは `localStorage` を廃止し、`PostgreSQL + Prisma` を主なデータ永続化基盤とする。
- CI/CDはGitLabリポジトリを前提に `GitLab CI/CD` を利用する。
- デプロイは `Docker + Kubernetes` を想定する。
- Phase 4完了後の限定共有デモは `Vercel + Neon` で公開する。本番基盤の想定とは分離して扱う。
- 初期構成はモジュラーモノリス型Next.jsアプリケーションとする。

## アーキテクチャ方針

新システムは、1リポジトリ、1デプロイ単位から開始します。ただし、内部構造は業務領域ごとに境界を分けるモジュラーモノリス型とします。

想定する主なモジュールは以下です。

- `members`
- `skills`
- `roles`
- `skill-map`
- `dashboard`
- `csv-import`
- `auth`
- `audit`
- `notifications`
- `ai-evaluation`

モジュール間はDBテーブルを直接触り合うのではなく、domain service、repository、use caseなどの公開された境界を経由して連携します。これにより、将来的に外部連携、AI評価ジョブ、CSV取り込み処理など一部だけ独立させる必要が出た場合にも分離しやすい構造を保ちます。

## モジュラーモノリス採用の理由

本プロジェクトでは、メンバー、スキル、ロール、評価、監査という業務境界が比較的はっきりしています。一方で、初期段階からマイクロサービス化すると、認証、デプロイ、監視、データ整合性、トランザクション管理の複雑さが先に増えてしまいます。

そのため、まずは1つのNext.jsアプリケーションとして開発速度と運用の単純さを保ちながら、内部のモジュール境界を明確にします。

## モジュラーモノリスへの反論・注意点

- モジュール境界を守らないと、ただの大きなNext.jsアプリになりやすい。
- 初期開発ではディレクトリ設計や依存ルールの分だけ、単純なCRUDアプリより実装コストが少し増える。
- チームが小さい段階では、境界設計を細かくしすぎると開発速度を落とす可能性がある。
- Prisma schemaや共通型が肥大化しやすいため、domain model、DTO、form schemaの分離ルールが必要。
- 将来的なマイクロサービス化を過度に意識しすぎると、現時点で不要な抽象化が増える。

上記を踏まえても、本プロジェクトではモジュラーモノリス型が妥当です。境界設計の現行ルールは `docs/ARCHITECTURE.md` を確認します。

## フェーズ概要

| フェーズ | 名称 | 状態 | 完了レビュー |
| --- | --- | --- | --- |
| Phase 0 | プロジェクト準備 | 完了 | [`PHASE0_COMPLETION_REVIEW.md`](archive/PHASE0_COMPLETION_REVIEW.md) |
| Phase 1 | 要件・ドメイン設計 | 完了 | [`PHASE1_COMPLETION_REVIEW.md`](archive/PHASE1_COMPLETION_REVIEW.md) |
| Phase 2 | アプリケーション基盤構築 | 完了 | [`PHASE2_COMPLETION_REVIEW.md`](archive/PHASE2_COMPLETION_REVIEW.md) |
| Phase 3 | コア業務機能 | 完了 | [`PHASE3_COMPLETION_REVIEW.md`](archive/PHASE3_COMPLETION_REVIEW.md) |
| Phase 4 | 可視化・検索・ダッシュボード | 完了 | [`PHASE4_COMPLETION_REVIEW.md`](archive/PHASE4_COMPLETION_REVIEW.md) |
| Phase 4.5 | デモ公開 | 完了 | [`PHASE4_5_COMPLETION_REVIEW.md`](archive/PHASE4_5_COMPLETION_REVIEW.md) |
| Phase 4.6 | 認証方針の確定 | 完了 | [`PHASE4_7_COMPLETION_REVIEW.md`](archive/PHASE4_7_COMPLETION_REVIEW.md) |
| Phase 4.7 | UI/UX改善と成長体験 | 完了 | [`PHASE4_7_COMPLETION_REVIEW.md`](archive/PHASE4_7_COMPLETION_REVIEW.md) |
| Phase 5 | CSV・監査・権限強化 | 完了 | [`PHASE5_COMPLETION_REVIEW.md`](archive/PHASE5_COMPLETION_REVIEW.md) |
| Phase 6 | AI評価機能 | 完了 | [`PHASE6_COMPLETION_REVIEW.md`](archive/PHASE6_COMPLETION_REVIEW.md) |
| R4・R5 | 使い勝手の改善 | 完了 | [`REVIEW4_5_COMPLETION_REVIEW.md`](archive/REVIEW4_5_COMPLETION_REVIEW.md) |
| R6 | スキルシートと承認の改善 | 完了 | [`R6_COMPLETION_REVIEW.md`](archive/R6_COMPLETION_REVIEW.md) |
| R7 | 振り返りとわくわく感 | 完了 | [`R7_COMPLETION_REVIEW.md`](archive/R7_COMPLETION_REVIEW.md) |
| S | セキュリティ強化 | 完了 | [`S_COMPLETION_REVIEW.md`](archive/S_COMPLETION_REVIEW.md) |
| C | リポジトリの整理 | 完了 | [`C_COMPLETION_REVIEW.md`](archive/C_COMPLETION_REVIEW.md) |
| E | 変更に耐える設計（キーの自動採番、ロール達成の記録、履歴の整理） | 完了 | - |
| F | 顧客提案用スキルシート（経歴・資格、AI の下書き、Excel のひな形と出力） | 完了 | - |
| G | 性能改善 | 完了（G-4 の速さの測り直しが残り） | [`PERFORMANCE.md`](PERFORMANCE.md) |
| H | Hub 基盤への載せ替え（Phase 7 を置き換える） | 進行中（H-7：基盤への登録待ち） | [`HUB_PLATFORM.md`](HUB_PLATFORM.md) |
| Phase 7 | 本番化・運用準備 | フェーズ H に置き換え | - |

## 今後の順番

1. 社内サーバ（Hub シリーズの基盤）に、ひな形 `hub-template` の形に合わせて載せる（フェーズ H）。
2. AIの「迷ったときの相談」は、社内で使えるAIの窓口が決まった時点で差し込む。

## フェーズ H: Hub 基盤への載せ替え

### 目的

TalentHub を、Hub シリーズの製品 `talenthub` として、社内サーバの基盤（共通のログイン・テナント・社員情報・クラスタ）の上で動かす。形はひな形 `chosen-ryoiki-group/hamburg/hub-template` に合わせ、基盤の決まりは `contract/`（契約 v0.20.0）を正とする。手順はスキル `.claude/skills/migrate-to-hub`、構成と配布は [`HUB_PLATFORM.md`](HUB_PLATFORM.md)。

### 決定事項（H-0、2026-11-19 利用者と合意）

- 演出と文言は、基盤の見た目の決まりに合わせて控えめにする（紙吹雪や動きはやめ、バッジと成長の記録は残す）。
- AI の 3 つの機能は、定期実行が社内の LLM で裏で作り、できたら表示する。LLM が使えないときは今の簡易版を出す。
- 上司・部下と担当範囲は、基盤の組織をそのまま使う。Hub の中ではマネージャーの権限だけを付ける。
- Vercel と Neon のデモは、今の版で凍結して残す（タグ `demo-final`。手順は `DEMO_DEPLOYMENT.md`）。
- 運用データはまだ無いので、データの引っ越しはしない。
- 基盤への質問の回答（hub-platform#4）：Server Actions は契約 v0.20.0 から `Origin` が同じなら CSRF のヘッダが無くてよい。画面と API は 1 つのサービスで受けてよい。devkit は Docker なしでも CI でも動く。製品 `talenthub` と接頭辞 `/talent`（通知も）は登録済み。

### 段

| 段 | 内容 | 状態 |
|---|---|---|
| H-0 | 差の洗い出しと決定、基盤への質問 | 完了 |
| H-1 | 土台：契約の写し・スクリプト・スキル、イメージ、`deploy/`、CI、手元の devkit の設定、死活の確認 | 完了 |
| H-2 | 身元と書き込み：`X-Auth-*` で受け取る、自前のログイン・パスワードを外す、`/talent`・`/api/talent/v1` へ経路を付け替える、Hub の中の権限 | 完了（!138・!140） |
| H-3 | テナント分離：全テーブルに `tenant_id` と RLS、リクエストごとに `app.tenant_id` | 完了（!141） |
| H-4 | 社員・組織：社員・部署の表をやめ、基盤の gRPC で引く | 完了（!142〜!145） |
| H-5 | LLM：AI の機能を定期実行に移し、結果を DB に置く | 完了（!146・!147） |
| H-6 | 見た目：`tokens.css` と `layout.md`、演出と文言を控えめに | 完了（!149・!151・!152・!154。主の色はえんじ色） |
| H-7 | 載せる：基盤への登録（一覧ファイル）、dev への配布 | 進行中。`SkillLevel` を migration で入れる（!153）、イメージの作成を直す（!155）、イメージとタグは用意済み。基盤への登録は hub-platform!56・#11（テナント `ksk`・`techno`）で依頼中 |
| H-8 | 仕上げ：完了レビュー、スキル `migrate-to-hub` の見直し、下の「申し送り」を issue に移す（運用は issue で回すため。`docs/DEVELOPMENT_WORKFLOW.md`） | 未着手 |

段をまたいで直さない。各段の終わりに既存のテストを通し、H-3 以降はテナントをまたいで見えないことのテストを足す。

## Phase 7: 本番化・運用準備

### 目的

本番リリースに向けて、テスト、デプロイ、運用手順、監視を整備します。

### 主なタスク

- Playwrightで主要E2Eを整備する。
- GitLab Container Registryへのpushを整備する。
- 環境別deployを整備する。Kubernetesのmanifestは、環境構成が決まってから作る（ひな形だった`k8s/`はCで削除した）。
- production deployにはmanual approvalを挟む。
- migration checkを整備する。
- 本番DB migration手順を整理する。
- rollback方針を整理する。
- セキュリティ、監査、バックアップ、運用監視、障害対応手順をドキュメント化する。
- 社内サーバーへ乗せ換えるときに、Vercel向けの設定（`vercel.json`）と`docs/DEMO_DEPLOYMENT.md`のVercelの手順を整理する（デモがVercelで動いている間は、mainだけをデプロイするために`vercel.json`が必要）。
- `docker-compose.yml`の`AUTH_SECRET`を、ダミーの固定値ではなく`.env`から読む形にする（今のダミー値は32文字以上あり、本番の長さのチェックを通ってしまう）。→ H-1 で `docker-compose.yml` を devkit の形に作り直し、`AUTH_SECRET` は無くなった。

### 完了条件

- 主要業務フローがE2Eで検証される。
- dev、staging、productionのデプロイ方針が決まっている。
- 本番反映とDB migrationの手順が明文化されている。
- 運用開始後の監視、バックアップ、障害対応の基本方針がある。

## 申し送り（未着手の課題）

完了したフェーズで見送った課題です。着手するときは、利用者と相談して範囲を決めます。フェーズ H の完了（H-8）で issue に移し、以後は issue で管理します。

- pg の警告「Calling client.query() when the client is already executing a query is deprecated」が、起動ごとに 1 回出る（2026-11-23、H）。Prisma 7 が入れ子の読み込みを複数の SQL に分けて並行に流し、TalentHub はテナントを設定するためにすべての問い合わせをトランザクションの中で流すので、同じ接続に重なる（出どころは `@prisma/client` の内部）。今は警告だけで動きに影響はないが、pg 9 ではエラーになる。pg を 9 に上げず、Prisma の新しい版で直るのを待つ（利用者と合意）。直らないときは、入れ子の読み込みを JOIN 1 本にする設定を検討する（全画面の SQL が変わるので、性能の測り直しと全件のテストが要る）。
- devkit の入口が WebSocket を中継しないため、開発モードを devkit 越しに開くと画面が読み込み直しを繰り返す（2026-11-23、H）。手元の確認は本番ビルドで行う（`scripts\devkit-start.bat` の既定）。基盤への質問は、利用者が基盤の担当と話してから決める。

- E2E の `e2e/helpers/level-up.ts` の演出を閉じる処理は、まだ複数のテストで使っている（C）。
- マルチテナントと認証まわりは、意図して範囲外にしている（`docs/SECURITY.md`）。
- 上司が変わっても、承認待ちの申請の通知が新しい上司に届かない（承認待ちの一覧には出る）。
- カテゴリ名を変えた後に古いスキル CSV を取り込むと、旧名のカテゴリが自動で作られ、スキルがそこへ移る。
- CSV の出力をそのまま取り込めない場合がある（無効なロール・上司・スキルを参照する行）。
- 無効にしたスキルも承認はできるが、新しい申請はできない。無効スキルを要件に持つロールは、申請では達成できなくなる。
- スキル、カテゴリ、部署を統合・分割する機能がない。
- レベルの5段階が、コードと DB の制約に固定されている。
- 通知は当時の名前、監査ログはいまの名前で表示される（改名後に食い違う）。
- 中間の部署を無効にすると、その配下の部署がマネージャーの範囲から外れる。

## 受け入れ条件

- `ROADMAP.md` 単体で、開発順序、各フェーズの状態、次に行う作業が分かる。
- 完了したフェーズの詳細を完了レビューで確認できる。
- `docs/TECH_STACK.md` と技術方針が矛盾しない。
- モジュラーモノリス型の理由、注意点、モジュール境界が明記されている。
- GitLab CI/CD、PostgreSQL、Prisma、Auth.js、Docker、Kubernetesの位置づけが明確である。

## 現時点の未決事項

- 期間見積もり。
- 担当者。
- GitLab Issue番号。
- 利用する企業IdP。確定した時点で、NextAuth v4から移行するかを判断する（`docs/TECH_STACK.md` を参照）。
- PostgreSQLの運用方式。
- Kubernetes環境構成。
