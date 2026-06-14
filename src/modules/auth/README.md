# auth module

認証済みユーザー、RBAC、操作可否判定を配置します。

Auth.js自体の配線は `src/server/auth` に置き、Credentials認証、ログイン試行制限、セッション再評価などのアプリケーション処理はこのモジュールの `application` 配下に置きます。
