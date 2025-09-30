@echo off
echo ========================================
echo 🛠️  LEMONADE STAND STARTUP FIX 🛠️
echo ========================================
echo.

echo 🔄 Killing any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo 📂 Setting up environment...
cd /d "%~dp0"

if not exist "server\node_modules" (
    echo 📦 Installing server dependencies...
    cd server
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install server dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

echo 🚀 Starting server with enhanced logging...
start "Lemonade Stand Server" cmd /k "cd /d "%CD%\server" && node index-modular.js"

echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

echo 🌐 Opening game in browser...
start "" "http://localhost:3001/game-interface.html?t=%time::=%"

echo.
echo ========================================
echo 🎮 GAME SHOULD NOW BE RUNNING!
echo ========================================
echo.
echo If the game doesn't load:
echo 1. Check the server window for any error messages
echo 2. Try refreshing the browser
echo 3. Make sure no other programs are using port 3001

echo.
pause
