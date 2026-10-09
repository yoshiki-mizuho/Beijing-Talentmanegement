# 開発ワークフロー

## 目的

このドキュメントは、GitLabを前提とした開発運用方針を定義するものです。

Phase 0では、Issue、branch、Merge Request、review、merge、CI/CDの基本ルールを決め、開発開始後の迷いを減らします。

## 基本方針

- `main` は常にデプロイ可能な状態を保つ。
- 作業は原則としてGitLab Issueに紐付ける。
- 変更はMerge Request経由で取り込む。
- ドキュメント変更もコード変更と同じくレビュー対象にする。
- CIの必須チェックを通過してからmergeする。
- 小さく、レビューしやすい単位でMRを作成する。

## Issue運用

Issueには以下を記載します。

- 背景
- 目的
- 対象範囲
- 完了条件
- 関連ドキュメント
- 関連Phase

Issueの粒度は、1つのMRで完了できる大きさを目安にします。大きなテーマはEpicや親Issueで管理し、実装可能な単位へ分割します。

## Branch運用

branch命名は以下を基本とします。

| 種別 | 命名 | 用途 |
| --- | --- | --- |
| feature | `feature/<short-name>` | 新機能 |
| fix | `fix/<short-name>` | 不具合修正 |
| docs | `docs/<short-name>` | ドキュメント変更 |
| chore | `chore/<short-name>` | 設定、依存、CI、雑務 |
| refactor | `refactor/<short-name>` | 振る舞いを変えない整理 |

Issue番号がある場合は、`feature/123-member-crud` のように番号を含めます。

## Merge Request運用

MRには以下を記載します。

- 変更概要
- 対象Issue
- 変更範囲
- 確認方法
- 影響範囲
- レビュー観点

MRは可能な限り小さく保ちます。DB migration、画面変更、CI変更など影響範囲が異なる変更は、分けられる場合は分けます。

pushまたはMR作成前には、最新のremote変更を取り込むために `git pull --rebase` を実行します。初回pushなど現在ブランチにupstreamがない場合は、MRのtarget branchを指定して `git pull --rebase origin <target-branch>` を実行します。conflictが発生した場合は解消し、必要な確認を行ってからpushします。

## Review方針

レビューでは以下を優先します。

- 要件と完了条件を満たしているか。
- モジュール境界と依存方向を守っているか。
- 認証、認可、監査の観点で問題がないか。
- DB migrationやデータ更新にリスクがないか。
- テストが変更リスクに見合っているか。
- UIが業務利用に耐えるか。

表記ゆれや細かな好みより、動作、安全性、保守性を優先します。

## CI/CD方針

GitLab CIのクレジットを節約するため、パイプラインはMerge Request時のみ実行します。`main` へのpushやブランチへのpushではパイプラインを作成しません。

Merge Request時の必須チェックは以下とします。

- `lint`
- `typecheck`
- `migration_check`
- `test`
- `build`
- `SAST`

`main` マージ後は以下を実行する想定です。

- Docker image build
- GitLab Container Registryへのpush
- dev環境へのdeploy

staging、productionへのdeployはGitLab Environmentsで管理します。production deployはmanual approvalを挟みます。

## DB migration方針

DB migrationは、アプリケーション変更と同じMRでレビューします。

本番では自動適用を前提にせず、以下を確認してから実行します。

- migration checkが通ること。
- 既存データへの影響が説明されていること。
- rollbackまたは復旧方針が説明されていること。
- 必要に応じて事前バックアップを取ること。

## ドキュメント運用

設計判断や運用ルールを変更する場合は、関連ドキュメントも同じMRで更新します。

主なドキュメントは以下です。

- `docs/TECH_STACK.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/MVP_REVIEW.md`
- `docs/AI_COLLABORATION.md`（Claude CodeとCodexの役割分担と開発ループ）
- `docs/LOCAL_DEVELOPMENT.md`（ローカル開発環境の構築と検証コマンド）

## Phase 0での位置づけ

このドキュメントは初期運用ルールです。GitLab CI/CDの実ファイル、Kubernetes manifest、環境別デプロイ設定はPhase 2以降で具体化します。
