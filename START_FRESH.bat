@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🍋 LEMONADE STAND STOCK MARKET GAME 🍋
echo ========================================
echo.
echo 🔄 Starting with enhanced logging...
echo.

REM Configuration
set "BACKEND_PORT=3001"
set "BACKEND_DIR=%~dp0server"
set "ENTRY_FILE=index-modular.js"
set "HEALTH_URL=http://localhost:%BACKEND_PORT%/api/health"
set "CLEAR_LEDGER_URL=http://localhost:%BACKEND_PORT%/api/clear-ledger"
set "GAME_URL=http://localhost:%BACKEND_PORT%/game-interface.html"

REM Kill any existing Node.js processes
echo 🔄 Checking for existing Node.js processes...
tasklist | findstr "node" >nul
if !errorlevel! == 0 (
    echo ⚠️  Found existing Node.js processes. Attempting to close them...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Start the backend server with logging
echo 🚀 Starting backend server...
cd /d "%BACKEND_DIR%"
set "BACKEND_LOG=server_%date:/=%-%time::=%.log"
set "BACKEND_LOG=%BACKEND_LOG: =0%"
set "BACKEND_LOG=%BACKEND_LOG:,=.%"

echo 📝 Backend logs will be written to: %BACKEND_DIR%\%BACKEND_LOG%

start "Backend Server" cmd /k "echo Starting server... && node %ENTRY_FILE% ^> "%BACKEND_LOG%" 2^>^&1 || pause"

REM Wait for backend to start
echo ⏳ Waiting for backend to start (max 60 seconds)...
set "retries=0"
:check_backend
timeout /t 1 /nobreak >nul
set /a retries=retries+1

curl -s -m 5 %HEALTH_URL% >nul 2>&1
if !errorlevel! neq 0 (
    if !retries! geq 60 (
        echo ❌ Backend failed to start after 60 seconds.
        echo 📝 Check the log file for errors: %BACKEND_DIR%\%BACKEND_LOG%
        echo 📝 Or check the 'Backend Server' window for errors.
        pause
        exit /b 1
    )
    set /p =■<nul
    goto check_backend
)

echo.
echo ✅ Backend is running at http://localhost:%BACKEND_PORT%

REM Clear ledger for a fresh start
echo 🧹 Clearing ledger for fresh game start...
curl -s -m 5 -X POST %CLEAR_LEDGER_URL% >nul 2>&1
if !errorlevel! neq 0 (
    echo ⚠️  Could not clear ledger (server might be starting up). Continuing...
) else (
    echo ✅ Ledger cleared successfully.
)

REM Open the game in default browser with cache busting
set "timestamp=%time::=%"
set "timestamp=%timestamp: =0%"
set "timestamp=%timestamp:.=%"
set "GAME_URL=%GAME_URL%?t=%timestamp%"

echo 🌐 Opening game in browser...
start "" "%GAME_URL%"

echo.
echo ========================================
echo 🎮 GAME IS READY TO PLAY!
echo ========================================
echo.
echo 📋 Game URL: %GAME_URL%
echo 📝 Backend Log: %BACKEND_DIR%\%BACKEND_LOG%
echo.
echo 💡 If the game doesn't open automatically, copy and paste the URL into your browser.
echo.
pause
