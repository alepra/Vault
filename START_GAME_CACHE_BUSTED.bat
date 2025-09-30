@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🍋 LEMONADE STAND STOCK MARKET GAME 🍋
echo ======== FIXED VERSION ==========
echo.
echo 🔄 Starting with enhanced error checking...
echo.

REM Configuration - using absolute paths to prevent issues
set "GAME_DIR=%~dp0"
set "BACKEND_PORT=3001"
set "BACKEND_DIR=%GAME_DIR%server"
set "ENTRY_FILE=index.js"
set "HEALTH_URL=http://localhost:%BACKEND_PORT%/api/health"
set "CLEAR_LEDGER_URL=http://localhost:%BACKEND_PORT%/api/clearledger"

REM Kill any existing Node processes to prevent port conflicts
echo 🔄 Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Verify Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Verify server directory and entry file
if not exist "%BACKEND_DIR%\%ENTRY_FILE%" (
    echo ❌ Cannot find server file: %BACKEND_DIR%\%ENTRY_FILE%
    echo Please ensure you're running this from the correct directory
    pause
    exit /b 1
)

REM Start the backend server with logging
echo 🚀 Starting backend server...
REM Stay in the main game directory, not the server subdirectory
cd /d "%GAME_DIR%"

REM Create a timestamp for log files
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,8%-%dt:~8,6%"
set "BACKEND_LOG=%BACKEND_DIR%\server_%timestamp%.log"

echo 📝 Backend logs will be written to: %BACKEND_LOG%

start "Backend Server" cmd /k "echo Starting server... & node %BACKEND_DIR%\%ENTRY_FILE% > %BACKEND_LOG% 2>&1 & echo Server stopped. Press any key to close... & pause"

REM Wait for backend to start
echo ⏳ Waiting for backend to start (max 30 seconds)...
set "retries=0"
:wait_backend
timeout /t 1 /nobreak >nul
set /a retries=retries+1

curl -s -m 5 %HEALTH_URL% >nul 2>&1
if !errorlevel! neq 0 (
    if !retries! geq 30 (
        echo ❌ Backend failed to start after 30 seconds.
        echo 📝 Check the log file for errors: %BACKEND_DIR%\%BACKEND_LOG%
        echo 📝 Or check the 'Backend Server' window for errors.
        pause
        exit /b 1
    )
    set /p =■<nul
    goto wait_backend
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
set "GAME_URL=http://localhost:%BACKEND_PORT%/game-interface.html?t=%timestamp%"

echo 🌐 Opening game in browser...
start "" "%GAME_URL%"

echo.
echo ========================================
echo 🎮 GAME IS READY TO PLAY!
echo ====================================
echo.
echo 📋 Game URL: %GAME_URL%
echo 📝 Backend Log: %BACKEND_DIR%\%BACKEND_LOG%
echo.
echo 💡 If the game doesn't open automatically, copy and paste the URL into your browser.
echo.

:end
pause
