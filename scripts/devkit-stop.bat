@echo off
rem scripts\devkit-start.bat で起動した TalentHub（ポート 3000）と hub-devkit（ポート 8000）を止める。
rem ウィンドウの題名は起動のしかたで付かないことがあるので、ポートを使っているプロセスを止める。
rem このファイルは Shift_JIS で保存する（cmd は UTF-8 の日本語の行を読み違えることがある）。
setlocal

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING" /C:":8000 .*LISTENING"') do (
  taskkill /PID %%p /T /F >nul 2>nul
)

rem 起動のときに開いたウィンドウが残っていれば閉じる
taskkill /FI "WINDOWTITLE eq TalentHub*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq hub-devkit*" /T /F >nul 2>nul

curl -s -o nul http://localhost:8000/login
if not errorlevel 1 goto :still
curl -s -o nul http://localhost:3000/talent/health
if not errorlevel 1 goto :still
echo 止めました。
goto :end

:still
echo まだ応答があります。TalentHub と hub-devkit のウィンドウで Ctrl+C を押して閉じてください。

:end
"%SystemRoot%\System32\ping.exe" -n 4 127.0.0.1 >nul
endlocal
