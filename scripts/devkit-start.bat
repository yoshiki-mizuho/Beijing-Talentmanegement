@echo off
rem TalentHub を hub-devkit（開発用の入口と偽の基盤）の後ろで起動する。Docker を使わない手元向け。
rem 使い方: scripts\devkit-start.bat         開発モード（npm run dev。コードの変更がすぐ反映される）
rem         scripts\devkit-start.bat prod    本番ビルド（build してから next start）
rem 止めるときは scripts\devkit-stop.bat
rem このファイルは Shift_JIS で保存する（cmd は UTF-8 の日本語の行を読み違えることがある）。
setlocal

set "ROOT=%~dp0.."
rem devkit は、リポジトリの隣の hub-platform（契約の版のタグ CONTRACT_TAG に切り替えたもの）で作る
set "PLATFORM_DIR=%~dp0..\..\hub-platform"
set "DEVKIT_EXE=%PLATFORM_DIR%\devkit\hub-devkit.exe"
set "CONTRACT_TAG=hub-contract/v0.20.0"

rem 1. PostgreSQL が動いているか
"%SystemRoot%\System32\sc.exe" query postgresql-x64-17 | "%SystemRoot%\System32\find.exe" "RUNNING" >nul
if errorlevel 1 (
  echo [エラー] PostgreSQL（サービス postgresql-x64-17）が止まっています。
  echo services.msc で開始してから、もう一度実行してください。
  goto :fail
)

rem 2. すでに起動していないか
curl -s -o nul http://localhost:8000/login
if not errorlevel 1 (
  echo すでに起動しています。ブラウザで開きます。
  start "" http://localhost:8000/login
  goto :end
)

rem 3. devkit の実行ファイルがあるか。無ければ作る
if not exist "%DEVKIT_EXE%" (
  echo devkit が見つかりません: %DEVKIT_EXE%
  choice /M "基盤のリポジトリを %CONTRACT_TAG% で取得して devkit を作りますか"
  if errorlevel 2 goto :fail
  call :build_devkit || goto :fail
)

rem 4. 偽の基盤の接続先（起動するウィンドウに引き継がれる）
set "PLATFORM_USER_ORG_GRPC_ADDR=localhost:9192"
set "PLATFORM_TENANT_GRPC_ADDR=localhost:9195"
set "PLATFORM_NOTIFICATION_GRPC_ADDR=localhost:9193"
set "PLATFORM_LLM_GRPC_ADDR=localhost:9184"
set "HUB_NAME=talenthub"
set "DEVKIT_HUB_NAME=talenthub"
set "DEVKIT_HUB_PATH_PREFIX=talent"
set "DEVKIT_CONFIG=%ROOT%\dev\devkit.local.yaml"

rem 5. TalentHub と devkit を、それぞれのウィンドウで起動する
if /i "%~1"=="prod" (
  echo TalentHub を本番ビルドで起動します（build に 1 分ほどかかります）。
  start "TalentHub" /D "%ROOT%" cmd /k "npm.cmd run build && node --env-file=.env node_modules\next\dist\bin\next start"
) else (
  echo TalentHub を開発モードで起動します。
  start "TalentHub" /D "%ROOT%" cmd /k "npm.cmd run dev"
)
start "hub-devkit" /D "%PLATFORM_DIR%\devkit" cmd /k ""%DEVKIT_EXE%""

rem 6. 応答するまで待ってからブラウザで開く（最大 3 分）
echo 起動を待っています...
set /a WAITED=0
:wait
rem 3 秒待つ（timeout は入力がつながっていないと待たずに失敗するため ping で待つ）
"%SystemRoot%\System32\ping.exe" -n 4 127.0.0.1 >nul
set /a WAITED+=3
curl -s -o nul http://localhost:8000/login || goto :wait_next
curl -s -o nul http://localhost:3000/talent/health || goto :wait_next
goto :ready
:wait_next
if %WAITED% geq 180 (
  echo [エラー] 3 分たっても起動しませんでした。TalentHub と hub-devkit のウィンドウのメッセージを確かめてください。
  goto :fail
)
goto :wait

:ready
echo.
echo 起動しました: http://localhost:8000/login
echo   ADMIN   22222222-2222-4222-8222-222222222222
echo   MANAGER 22222222-2222-4222-8222-000000000004
echo   MEMBER  22222222-2222-4222-8222-000000000005（伊藤 さくら）
echo 利用者を選んでログインした後、http://localhost:8000/talent を開きます。
echo 画面は必ず localhost:8000 から開きます（localhost:3000 を直接開くとログインの情報が届きません）。
echo AI の下書きを作るときは scripts\devkit-jobs.bat、止めるときは scripts\devkit-stop.bat
start "" http://localhost:8000/login
goto :end

:build_devkit
where git >nul 2>nul || (echo [エラー] git が見つかりません。& exit /b 1)
set "GO_EXE=go"
where go >nul 2>nul || set "GO_EXE=C:\Program Files\Go\bin\go.exe"
if not exist "%PLATFORM_DIR%" (
  git clone --depth 1 --branch %CONTRACT_TAG% https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git "%PLATFORM_DIR%" || exit /b 1
)
pushd "%PLATFORM_DIR%\devkit" || exit /b 1
"%GO_EXE%" build -o hub-devkit.exe ./cmd/hub-devkit || (popd & exit /b 1)
popd
echo devkit を作りました: %DEVKIT_EXE%
exit /b 0

:fail
endlocal
pause
exit /b 1

:end
endlocal
exit /b 0
