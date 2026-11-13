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
| Phase 7 | 本番化・運用準備 | 未着手 | - |

## 今後の順番

1. Phase 7の本番化・運用準備へ進む。
2. AIの「迷ったときの相談」は、社内で使えるAIの窓口が決まった時点で差し込む。

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
- `docker-compose.yml`の`AUTH_SECRET`を、ダミーの固定値ではなく`.env`から読む形にする（今のダミー値は32文字以上あり、本番の長さのチェックを通ってしまう）。

### 完了条件

- 主要業務フローがE2Eで検証される。
- dev、staging、productionのデプロイ方針が決まっている。
- 本番反映とDB migrationの手順が明文化されている。
- 運用開始後の監視、バックアップ、障害対応の基本方針がある。

## 申し送り（未着手の課題）

完了したフェーズで見送った課題です。着手するときは、利用者と相談して範囲を決めます。

- スマホ幅で「はじめの3ステップ」が出ると、ヘッダーがはみ出す（R6。直し方は利用者の判断待ち）。
- スキルの大分類の一括割り当てと、未分類だけの絞り込み（R6）。
- 一覧の細部の改善（Phase 4.7 の疑似ユーザーテストの U7）。
- E2E の `e2e/helpers/level-up.ts` の演出を閉じる処理は、まだ複数のテストで使っている（C）。
- マルチテナントと認証まわりは、意図して範囲外にしている（`docs/SECURITY.md`）。

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
