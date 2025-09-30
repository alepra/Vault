# 🍋 Lemonade Stand Stock Market Game - Setup & Run Guide

## Quick Start

### Prerequisites
- Node.js 16+ installed
- npm package manager

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start Both Servers (Recommended)
```bash
npm run dev
```
This starts both backend (port 5000) and frontend (port 3000) concurrently.

### 3. Start Servers Individually (Alternative)
```bash
# Backend only (port 5000, fallback 5001)
npm run dev:backend

# Frontend only (port 3000, fallback 3001)  
npm run dev:frontend
```

### 4. Access the Game
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health
- Version Info: http://localhost:5000/api/version

## Environment Configuration

### Backend (.env)
Copy `env.example` to `.env` and configure:
```bash
cp env.example .env
```

Key variables:
- `PORT=5000` - Backend server port
- `NODE_ENV=development` - Environment mode

### Frontend (.env)
Copy `client/env.example` to `client/.env` and configure:
```bash
cp client/env.example client/.env
```

Key variables:
- `REACT_APP_API_URL=http://localhost:5000` - Backend API URL
- `PORT=3000` - Frontend server port

## Architecture

### Backend (server/)
- Express.js server with Socket.IO for real-time updates
- SQLite database for persistence
- Modular game logic (IPO, Trading, Ledger)
- Bot profiles with realistic trading behavior

### Frontend (client/)
- React application with TypeScript
- Real-time updates via Socket.IO
- Responsive UI for all game phases

## Game Features

### 1. Authoritative IPO Close
- Dutch auction with proper clearing price
- Bot guardrails (ownership caps, budget limits)
- Atomic allocation with structured logging
- Automatic transition to newspaper phase

### 2. Market Orders MVP
- Immediate execution at best available price
- Real-time trade matching
- Bot trading with personality-based strategies
- Price discovery and market making

### 3. Bot Guardrails
- Scavenger bots: ≤34% ownership, liquidity maintenance
- CEO bots: ≤35% ownership, concentrated positions
- Aggressive/Conservative/Balanced profiles
- Trend and rumor sensitivity

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Start both servers concurrently
npm run dev

# Start individual servers
npm run dev:backend
npm run dev:frontend

# Build frontend for production
npm run build:frontend

# Start production servers
npm run start:backend
npm run start:frontend
```

## Troubleshooting

### Port Conflicts
- Backend: Tries 5000, falls back to 5001
- Frontend: Tries 3000, falls back to 3001
- Check console logs for actual ports used

### Server Won't Start
1. Kill existing Node processes: `taskkill /F /IM node.exe` (Windows)
2. Check for port conflicts
3. Verify dependencies: `npm run install:all`
4. Check environment variables

### Database Issues
- Game uses SQLite (server/game.db)
- No external database setup required
- Database is created automatically

## Production Deployment

### Build Frontend
```bash
npm run build:frontend
```

### Environment Variables
Set `NODE_ENV=production` for optimized builds.

### Static Files
Production mode serves built frontend from backend server.

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/version` - Version information
- `GET /api/game/:sessionId` - Game state
- `POST /api/game/:sessionId/join` - Join game
- `POST /api/game/:sessionId/bid` - Submit IPO bid
- `POST /api/game/:sessionId/trade` - Submit trade order

## Socket.IO Events

- `gameStateUpdate` - Game state changes
- `ipoCompleted` - IPO phase completion
- `tradeExecuted` - Trade execution
- `phaseChange` - Game phase transitions