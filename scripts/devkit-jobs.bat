@echo off
rem 画面で予約した AI の下書きを、1 回だけ作る（クラスタの 5 分ごとの定期実行の代わり）。
rem 偽の基盤の LLM が決まった文を返す。先に scripts\devkit-start.bat で起動しておく。
rem このファイルは Shift_JIS で保存する（cmd は UTF-8 の日本語の行を読み違えることがある）。
setlocal

set "PLATFORM_USER_ORG_GRPC_ADDR=localhost:9192"
set "PLATFORM_TENANT_GRPC_ADDR=localhost:9195"
set "PLATFORM_NOTIFICATION_GRPC_ADDR=localhost:9193"
set "PLATFORM_LLM_GRPC_ADDR=localhost:9184"
set "HUB_NAME=talenthub"

pushd "%~dp0.."
call npm.cmd run jobs:ai
popd

endlocal
pause
