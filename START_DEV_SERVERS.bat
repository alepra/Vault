@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🍋 LEMONADE STAND - Development Servers
echo ========================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Kill any existing Node processes
echo 🔄 Stopping existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo ✅ Ready to start servers
echo.
echo 📊 Backend will run on: http://localhost:5000
echo 🌐 Frontend will run on: http://localhost:3000
echo.

REM Start both servers using npm
echo 🚀 Starting servers with concurrently...
npm run dev

pause




