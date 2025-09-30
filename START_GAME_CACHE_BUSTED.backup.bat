@echo off
echo ========================================
echo 🍋 LEMONADE STAND STOCK MARKET GAME 🍋
echo ========================================
echo.
echo 🔄 Starting with CACHE BUSTING and health checks...
echo.

REM Configuration
set "BACKEND_PORT=3001"
set "BACKEND_DIR=%~dp0server"
set "ENTRY_FILE=index-modular.js"
set "HEALTH_URL=http://localhost:%BACKEND_PORT%/api/health"
set "CLEAR_LEDGER_URL=http://localhost:%BACKEND_PORT%/api/clear-ledger"

REM Start the backend server (modular server serves the client statics)
echo 🚀 Starting backend server (Node-only, with logging)...
cd /d "%~dp0"
set "BACKEND_LOG=%BACKEND_DIR%\server.log"
echo 📝 Backend logs will be written to: %BACKEND_LOG%
start "Backend Server" powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -Path '%BACKEND_DIR%'; $Log='%BACKEND_LOG%'; Start-Transcript -Path $Log -Append | Out-Null; node %ENTRY_FILE%; Stop-Transcript | Out-Null"

REM Wait for backend readiness by polling health endpoint
echo ⏳ Waiting for backend health at %HEALTH_URL% ...
set /a retries=0
:wait_backend
curl -s %HEALTH_URL% >nul 2>&1
if %errorlevel% neq 0 (
    set /a retries+=1
    if %retries% geq 60 (
        echo ❌ Backend health check failed after %retries% seconds. Check the 'Backend Server' window for errors.
        echo 📝 You can also open the log file here: %BACKEND_LOG%
        goto end
    )
    timeout /t 1 /nobreak >nul
    goto wait_backend
)
echo ✅ Backend is healthy.

REM Clear backend ledger for fresh start (after health is OK)
echo 🧹 Clearing backend ledger for fresh game start...
curl -s -X POST %CLEAR_LEDGER_URL% >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Ledger clear request may have failed. Continuing...
)
echo ✅ Ledger clear requested.

REM Generate dynamic cache busting timestamp using PowerShell
for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString(''yyyyMMddHHmmss'')"') do set timestamp=%%i

REM Open the game interface (served by backend) with dynamic cache busting
set "GAME_URL=http://localhost:%BACKEND_PORT%/game-interface.html?fresh=true&cb=%timestamp%"
echo 🌐 Opening game interface...
echo 📋 URL: %GAME_URL%
start "" "%GAME_URL%"

echo.
echo ✅ Game started with cache busting!
echo 💡 Frontend is served directly by the backend server (no Python).
echo.
echo 📝 Instructions:
echo    1. Enter your name in the game lobby
echo    2. Click "Start Game"
echo    3. Submit your IPO bids when the interface appears
echo    4. AI bots will wait for you (time-limited phases)
echo.

:end
pause
