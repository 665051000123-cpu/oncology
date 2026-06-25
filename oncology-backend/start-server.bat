@echo off
title Clinical API Bridge - oncology-backend
cd /d "d:\patien-system\oncology-backend"
echo 🚀 Starting Clinical API Bridge (Port 5004)...
echo --------------------------------------------------
node server.js
if %errorlevel% neq 0 (
    echo ❌ Failed to start server. Please check if Node.js is installed.
    pause
)
pause
