@echo off
rem Starts Dragon Dictionary on http://localhost:3210 and opens it.
rem If it is already running, only opens the browser tab.
rem Closing this window stops the app.
setlocal
set "URL=http://localhost:3210"
title Dragon Dictionary

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
  if not defined DRAGON_NO_BROWSER start "" "%URL%"
  exit /b 0
)

cd /d "%~dp0frontend"
if not exist ".next\BUILD_ID" (
  echo There is no build yet. Run update.cmd first.
  pause
  exit /b 1
)

rem Open the browser as soon as the app answers.
if not defined DRAGON_NO_BROWSER (
  start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 2 | Out-Null; Start-Process '%URL%'; break } catch { Start-Sleep -Seconds 1 } }"
)

echo Dragon Dictionary is running at %URL%
echo Close this window to stop it.
echo.
call npm run start -- -p 3210
