# AI evaluation module

このモジュールは「育成のヒント」の生成結果とAI利用量を管理します。

AIクライアントはサーバーだけで利用します。

## 環境変数

- `AI_API_BASE_URL` はOpenAI互換APIのベースURLです。
- `AI_API_BASE_URL=fake` は通信しない偽のAIを有効にします。
- `AI_API_KEY` はサーバー専用のAPIキーです。
- `AI_MODEL` は呼び出すモデル名です。
- `AI_TIMEOUT_MS` は再試行を含む呼び出しの上限時間です。
- `AI_TIMEOUT_MS` の既定値は30000ミリ秒です。
- `AI_MONTHLY_TOKEN_LIMIT` は日本時間の暦月ごとのトークン上限です。
- `AI_MONTHLY_TOKEN_LIMIT` が未設定の場合は上限なしです。

偽のAIを使う場合は呼び出し側が`fakeResponse`を渡します。

APIキーに`NEXT_PUBLIC_`を付けません。

APIキーをログ、エラー、クライアントへ出しません。

AIには承認済みのスキルとレベルや目標ロールの要件だけを送ります。

氏名、メール、社員番号は送りません。
