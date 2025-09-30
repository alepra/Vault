@echo off
echo ========================================
echo 🍋 LEMONADE STAND - SIMPLE START 🍋
echo ========================================
echo.

REM Kill any existing Node processes
echo 🔄 Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Change to the project directory
cd /d "%~dp0"

echo 🚀 Starting server from: %CD%
echo 📁 Server file: %CD%\server\index.js
echo.

REM Start the server directly
echo Starting server...
node server\index.js

echo.
echo Server stopped. Press any key to close...
pause
