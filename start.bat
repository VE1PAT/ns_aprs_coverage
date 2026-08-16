@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found.
  echo Install the LTS version from https://nodejs.org/ then run this again.
  pause
  exit /b 1
)

echo Starting NS APRS coverage map...
echo Keep this window open. Press Ctrl+C to stop.
echo.
start "" "http://127.0.0.1:8765/"
node server.mjs
pause
