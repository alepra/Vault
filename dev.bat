@echo off
echo 🍋 Starting Lemonade Stand Game Development Servers
echo.

REM Kill any existing Node processes
taskkill /F /IM node.exe >nul 2>&1

REM Start backend in a new window
echo 🚀 Starting backend server...
start "Backend Server" cmd /k "cd /d server && node index.js"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window  
echo 🌐 Starting frontend server...
start "Frontend Server" cmd /k "cd /d client && npm start"

echo.
echo ✅ Both servers are starting up!
echo 📊 Backend: http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul




