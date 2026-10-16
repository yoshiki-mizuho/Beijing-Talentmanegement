# audit module

監査ログ、操作履歴、変更差分、import履歴を配置します。

## 記録の仕組み

- 業務の書き込みと同じトランザクションで、`infrastructure/audit-repository.ts` の `recordAuditLog`（一括は `recordAuditLogs`）を呼んで `AuditLog` に記録する。監査ログの書き込みに失敗したら、業務の書き込みも取り消される。
- 操作名と対象種別は `domain/audit-action.ts` に集約する。
- 更新は `domain/audit-diff.ts` の `diffForAudit` で、変わった項目だけを before と after に入れる。変わった項目名は `metadata.changedFields` に入れる。変化がなければ記録しない。
- メンバーの `profile`（自由記述）は値を記録せず、変わったことだけを `changedFields` に残す。パスワード、アバター画像は記録しない。
- 操作した人は `actorMemberId`。Server Action と API ルートから、セッションの `memberId` をサービス関数とリポジトリ関数に渡す。

## 記録する操作

メンバー（作成、更新、無効化、上司、目標ロール）、メンバースキル（作成、更新、削除）、スキル申告（作成）と審査（承認、補正承認、差し戻し）、スキル（作成、更新、無効化、削除、レベルの目安）、スキルカテゴリ（作成、更新、削除）、ロール（作成、更新、無効化、削除、要件の設定と削除）。

## 記録しない操作

通知の作成と既読、リアクション、コメント、応援、1on1 メモ、プロフィールの公開設定、アバター、パスワードの変更。CSV import/export と権限の変更は、Phase 5 の後続のタスクで記録する。部署は今は書き込みの手段がない。
