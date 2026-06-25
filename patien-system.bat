@echo off
title Clinical API Bridge - oncology-backend
cd /d "%~dp0oncology-backend"

:loop
echo 🚀 Starting Clinical API Bridge (Port 5004)...
echo --------------------------------------------------
node server.js

echo.
echo ❌ Server stopped or crashed. Restarting automatically in 3 seconds...
echo --------------------------------------------------
timeout /t 3 >nul
goto loop
