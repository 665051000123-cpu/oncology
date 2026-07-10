@echo off
echo Installing dependencies for Local Print Agent (if not installed)...
call npm install
echo.
echo Starting Local Print Agent...
node agent.js
pause
