# 🍋 Lemonade Stand - Quick Start Guide

## ✅ Project Analysis Complete

### Repository Structure
- **Type:** Monorepo with frontend and backend in same project
- **Package Manager:** npm (package-lock.json present)
- **Frontend:** React app in `client/` folder
- **Backend:** Express.js server in `server/` folder

### Port Configuration
| Service | Port | Fallback | URL |
|---------|------|----------|-----|
| Backend | 5000 | 5001 | http://localhost:5000 |
| Frontend | 3000 | 3001 | http://localhost:3000 |

---

## 🚀 Quick Start Commands

### 1. First Time Setup
```bash
# Install all dependencies (root + client)
npm run install:all
```

### 2. Start Development Servers

#### Option A: Start Both Servers Together (Recommended)
```bash
npm run dev
```

This will:
- ✅ Kill any existing Node processes
- ✅ Start backend on port 5000
- ✅ Start frontend on port 3000
- ✅ Show color-coded logs (blue=backend, green=frontend)
- ✅ Auto-fallback to ports 5001/3001 if needed

#### Option B: Start Servers Individually

**Backend Only:**
```bash
npm run dev:backend
```

**Frontend Only:**
```bash
npm run dev:frontend
```

---

## 📋 Environment Variables

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
```

### Frontend (`client/.env`)
```env
PORT=3000
REACT_APP_API_URL=http://localhost:5000
```

**Note:** These files have been created for you with proper defaults.

---

## 🧪 Testing the Setup

### 1. Test Backend Health
Open browser or run:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### 2. Test Frontend
Open browser to:
```
http://localhost:3000
```

You should see the Lemonade Stand game interface.

### 3. Check Console Output

**Backend should show:**
```
========================================
🍋 LEMONADE STAND - Backend Server
========================================
✅ Server running on port 5000
🌐 URL: http://localhost:5000
📊 Health check: http://localhost:5000/api/health
🔧 Environment: development
🗄️  Database: C:\Users\alepr\Lemonade Stand\server\game.db
========================================
```

**Frontend should show:**
```
Compiled successfully!

You can now view lemonade-stand-client in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## 🔧 Troubleshooting

### Problem: Port Already in Use
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Then restart
npm run dev
```

### Problem: Backend won't start
1. Check if port 5000 is available
2. Check `server/.env` file exists
3. Look for errors in console
4. Try fallback port: Set `PORT=5001` in `server/.env`

### Problem: Frontend can't connect to backend
1. Verify backend is running: `curl http://localhost:5000/api/health`
2. Check `client/.env` has `REACT_APP_API_URL=http://localhost:5000`
3. Restart frontend: `npm run dev:frontend`

### Problem: Missing dependencies
```bash
# Reinstall everything
npm run install:all
```

### Problem: Still not working
1. Delete `node_modules` and `package-lock.json` in root
2. Delete `node_modules` in `client/`
3. Run: `npm run install:all`
4. Run: `npm run dev`

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend concurrently |
| `npm run dev:backend` | Start backend only (port 5000) |
| `npm run dev:frontend` | Start frontend only (port 3000) |
| `npm start` | Start backend in production mode |
| `npm run build` | Build frontend for production |
| `npm run install:all` | Install all dependencies (root + client) |
| `npm test` | Run tests |

---

## 🏗️ What Was Fixed

### 1. **Port Configuration**
- ✅ Backend now uses port 5000 (was 3001)
- ✅ Frontend stays on port 3000
- ✅ Added automatic fallback ports (5001, 3001)

### 2. **Environment Variables**
- ✅ Created `server/.env` with PORT=5000
- ✅ Created `client/.env` with PORT=3000 and REACT_APP_API_URL
- ✅ Created `.env.example` files for reference
- ✅ Updated React app to read backend URL from env var

### 3. **Startup Scripts**
- ✅ Fixed `npm run dev` to use concurrently with proper labels
- ✅ Added `predev` hook to kill stale Node processes
- ✅ Simplified dev:backend and dev:frontend scripts

### 4. **Logging & Error Handling**
- ✅ Added detailed startup logs to backend
- ✅ Shows port, URL, health endpoint, environment, database path
- ✅ Added auto-fallback if port is in use
- ✅ Added better error messages

### 5. **Code Changes**
- ✅ Updated `client/src/App.tsx` to read REACT_APP_API_URL from env
- ✅ Updated `server/index.js` with better logging and port fallback
- ✅ Fixed CORS to allow both port 3000 and 3001

---

## 🎯 Next Steps

1. Run `npm run dev`
2. Wait for both servers to start (~10-30 seconds for frontend)
3. Open http://localhost:3000 in your browser
4. Start playing the Lemonade Stand Stock Market game!

---

## 📞 Need Help?

If servers still won't start:
1. Check the console output for specific error messages
2. Verify all dependencies are installed: `npm run install:all`
3. Make sure no other applications are using ports 3000 or 5000
4. Try running backend and frontend separately to isolate the issue

---

**Last Updated:** September 30, 2025
**Status:** ✅ Ready to run




