@echo off
title Patient System Launcher
echo ==================================================
echo         Patient System Launcher (Antigravity)
echo ==================================================
echo.
echo [1/2] Starting oncology-backend (Port 5004)...
start cmd /k "cd /d "%~dp0oncology-backend" && title Oncology Backend && npm start"

echo [2/2] Starting client (React/Vite)...
start cmd /k "cd /d "%~dp0client" && title Oncology Client && npm run dev"

echo.
echo ==================================================
echo 🚀 Both services are starting in separate windows.
echo - Backend: Port 5004 (or configured port)
echo - Client: Check the URL shown in the Client window (usually http://localhost:5173)
echo ==================================================
echo.
pause
