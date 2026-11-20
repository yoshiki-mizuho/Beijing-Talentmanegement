# Vercel + Neon デモ環境運用手順

## 凍結済み

デモ環境は凍結済みです。作り直すときはタグ `demo-final` から行います。それまでの運用手順はタグ `demo-final` の版のこのファイルにあります。

## Hub への載せ替えの前に凍結する

TalentHub は Hub シリーズの基盤に載せ替える（`docs/ROADMAP.md` のフェーズ H）。H-2 でログインを基盤に替えると、`main` は Vercel と Neon では動かなくなるため、デモは載せ替えの前の版で凍結して残す（2026-11-19 利用者と合意）。

1. H-2 を merge する前に、載せ替え前の `main` のコミットにタグ `demo-final` を付けて push する（Claude が行う）。
2. Vercel Project の Git 連携を止め、以降の `main` が Vercel にデプロイされないようにする（利用者が行う）。今の Production Deployment はそのまま残す。
3. Neon の DB はそのまま残す。`DEMO_DB_TASK` の手動パイプラインは、凍結の後は流さない。
   H-2a で `DEMO_DB_TASK` とデモ DB 用ジョブは CI から削除した。
4. デモを作り直す必要が出たときは、タグ `demo-final` から行う。
