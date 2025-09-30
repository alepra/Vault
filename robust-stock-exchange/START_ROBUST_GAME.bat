@echo off
echo ========================================
echo 🍋 ROBUST NEIGHBORHOOD STOCK EXCHANGE 🍋
echo ========================================
echo.
echo Complete IPO, Trading, and Market Making Game
echo Built with Clean Architecture Principles
echo.
echo Features:
echo   • Dutch Auction IPOs
echo   • Real-time Trading with Order Matching
echo   • AI Bot Market Makers
echo   • CEO Determination
echo   • Complete Game Flow
echo.

REM Kill any existing node processes on port 3003
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003') do taskkill /f /pid %%a >nul 2>&1

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the robust stock exchange server
echo 🚀 Starting Robust Stock Exchange Server...
start "Robust Stock Exchange" cmd /k "node server.js"

REM Wait for server to start
echo ⏳ Waiting for server to start...
timeout /t 3 /nobreak >nul

REM Open the game interface
echo 🌐 Opening game interface...
start "" "http://localhost:3003"

echo.
echo ✅ Robust Stock Exchange Game Started!
echo.
echo 🎮 How to Play:
echo    1. Add participants (or use existing AI bots)
echo    2. Start IPO phase
echo    3. Process IPO (Dutch auction)
echo    4. Start Trading phase
echo    5. Buy/sell shares with real order matching
echo    6. Watch AI bots trade automatically
echo.
echo 🎯 Key Features:
echo    • Real order matching and trade execution
echo    • No "orders accepted but no trades" issues
echo    • AI bots with different strategies
echo    • Market makers provide liquidity
echo    • CEO determination based on share ownership
echo    • Complete game flow from IPO to trading
echo.
echo 💡 This demonstrates clean architecture principles
echo    that solve all the problems in your original program!
echo.
pause
