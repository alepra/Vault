@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🍋 LEMONADE STAND - SERVER ONLY MODE 🍋
echo ========================================
echo.

REM Kill any existing Node processes
echo 🔄 Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Navigate to server directory
cd /d "%~dp0server"

REM Create a log file with timestamp
set "timestamp=%date:/=-%_%time::=-%"
set "timestamp=!timestamp: =0!"
set "logfile=server_!timestamp!.log"

echo 📝 Starting server with logging to: %cd%\!logfile!
echo 🚀 This may take a moment...

REM Start the server with detailed logging
start "Lemonade Stand Server" cmd /k "node index-modular.js > "!logfile!" 2>&1 & pause"

echo.
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo 🖥️  SERVER IS STARTING...
if not exist "..\client\game-interface.html" (
    echo ❗ WARNING: Client files not found in expected location
    echo The server may start, but the client might not be accessible
)

echo.
echo 📋 MANUAL STEPS:
echo 1. Open your web browser
echo 2. Go to: http://localhost:3001/game-interface.html?t=!time::=%
echo 3. If you see an error, wait 10 seconds and refresh

echo.
echo 🔍 Check the server window for any error messages
echo.
pause
