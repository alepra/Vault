@echo off
echo ========================================
echo 🍋 LEMONADE STAND STOCK MARKET GAME 🍋
echo ========================================
echo.
echo 🔄 Starting with CACHE BUSTING for fresh start...
echo.

REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>&1

REM Start the backend server
echo 🚀 Starting backend server...
cd /d "%~dp0"
start "Backend Server" cmd /k "cd server && node index.js"

REM Start the frontend server
echo 🌐 Starting frontend server...
start "Frontend Server" cmd /k "cd /d \"%~dp0\client\" && python -m http.server 8080"

REM Wait for server to start
timeout /t 5 /nobreak >nul

REM Clear backend ledger for fresh start
echo 🧹 Clearing backend ledger for fresh game start...
curl -s -X POST http://localhost:3001/api/clear-ledger >nul 2>&1
echo ✅ Backend ledger cleared

REM Generate dynamic cache busting timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%%HH%%Min%%Sec%"

REM Open the game interface with dynamic cache busting
echo 🌐 Opening game interface...
echo 📋 URL: http://localhost:8080/client/game-interface.html?fresh=true^&cb=%timestamp%
start "" "http://localhost:8080/client/game-interface.html?fresh=true&cb=%timestamp%"

echo.
echo ✅ Game started with cache busting!
echo 💡 This should force a fresh start without cached data
echo.
echo 📝 Instructions:
echo    1. Enter your name in the game lobby
echo    2. Click "Start Game" 
echo    3. Submit your IPO bids when the interface appears
echo    4. AI bots will wait for you (2 minute limit)
echo.
pause
