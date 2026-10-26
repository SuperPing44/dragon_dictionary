@echo off
rem Updates the daily copy: pulls main, installs and builds.
rem Refuses to run while the app is running.
setlocal
cd /d "%~dp0"

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
  echo Dragon Dictionary is running. Close its window first, then run update.cmd again.
  if not defined DRAGON_NO_PAUSE pause
  exit /b 1
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
if not "%BRANCH%"=="main" (
  echo This copy is on "%BRANCH%", not "main". The daily copy always runs main.
  if not defined DRAGON_NO_PAUSE pause
  exit /b 1
)

echo Pulling main...
git pull --ff-only origin main || goto failed

cd frontend
echo Installing...
call npm ci || goto failed
echo Building...
call npm run build || goto failed

echo.
echo Updated. Start Dragon Dictionary from the desktop shortcut.
echo Any database changes are applied on the next start, after a backup.
if not defined DRAGON_NO_PAUSE pause
exit /b 0

:failed
echo.
echo The update failed; see the messages above.
echo If the build broke, fix the cause and run update.cmd again before starting the app.
if not defined DRAGON_NO_PAUSE pause
exit /b 1
