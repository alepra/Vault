/**
 * Lemonade Stand Stock Market - Modular Server
 * Clean, organized, and debuggable architecture
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import modules
const GameStateModule = require('./modules/gameStateModule');
const IPOModule = require('./modules/ipoModule');
const TradingModule = require('./modules/tradingModule');
const LedgerModule = require('./modules/ledgerModule');
const BotNameModule = require('./modules/botNameModule');
const ModuleBridge = require('./modules/moduleBridge');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:8080"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize modules
const gameState = new GameStateModule();
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const botNameModule = new BotNameModule();
const moduleBridge = new ModuleBridge();

// Initialize the module bridge with all modules
moduleBridge.initializeModules(gameState, null, tradingModule, ledgerModule, botNameModule, io);

// Set up module bridge event listeners
moduleBridge.on('phaseChanged', (data) => {
  console.log(`📊 Phase changed to: ${data.phase}`);
  io.emit('gameStateUpdate', moduleBridge.getGameStateForClients());
});

moduleBridge.on('tradesProcessed', (data) => {
  console.log(`📈 Trades processed: ${data.trades.length} trades`);
  io.emit('gameStateUpdate', moduleBridge.getGameStateForClients());
  io.emit('tradesExecuted', data.trades);
});

let ipoModule = null;

// Database setup
const db = new sqlite3.Database('./game.db');

// Initialize database tables
db.serialize(() => {
  // Games table
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    phase TEXT NOT NULL,
    turn INTEGER DEFAULT 0,
    max_turns INTEGER DEFAULT 100,
    turn_length INTEGER DEFAULT 30,
    weather TEXT DEFAULT 'normal',
    economy TEXT DEFAULT 'normal',
    start_time DATETIME,
    end_time DATETIME,
    winner_id TEXT
  )`);

  // Participants table
  db.run(`CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    name TEXT NOT NULL,
    is_human BOOLEAN DEFAULT 1,
    personality TEXT,
    capital REAL DEFAULT 1000,
    remaining_capital REAL DEFAULT 1000,
    shares TEXT,
    is_ceo BOOLEAN DEFAULT 0,
    joined_at DATETIME,
    FOREIGN KEY (game_id) REFERENCES games (id)
  )`);

  // Companies table
  db.run(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    name TEXT NOT NULL,
    shares INTEGER DEFAULT 1000,
    current_price REAL DEFAULT 10.0,
    total_shares_allocated INTEGER DEFAULT 0,
    ceo_id TEXT,
    price REAL DEFAULT 1.0,
    quality REAL DEFAULT 0.5,
    marketing REAL DEFAULT 0.5,
    reputation REAL DEFAULT 0.5,
    revenue REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    demand REAL DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games (id)
  )`);

  // Shares table
  db.run(`CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    participant_id TEXT,
    company_id TEXT,
    quantity INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (participant_id) REFERENCES participants (id),
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )`);

  // Trades table
  db.run(`CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    buyer_id TEXT,
    seller_id TEXT,
    company_id TEXT,
    quantity INTEGER,
    price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (buyer_id) REFERENCES participants (id),
    FOREIGN KEY (seller_id) REFERENCES participants (id),
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    participant_id TEXT,
    company_id TEXT,
    order_type TEXT CHECK(order_type IN ('buy', 'sell')),
    quantity INTEGER,
    price REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (participant_id) REFERENCES participants (id),
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )`);

  // News table
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    company_id TEXT,
    headline TEXT,
    content TEXT,
    impact REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )`);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  console.log('Socket connection established at:', new Date().toLocaleTimeString());
  
  // Test event to verify socket communication
  socket.on('test', () => {
    console.log('🧪 TEST EVENT RECEIVED from socket:', socket.id);
  });

  // Reset game (clear all cache and start fresh)
  socket.on('resetGame', () => {
    console.log('🔄 Reset game requested - clearing all cache and starting fresh');
    
    // Reset game state
    gameState.resetGame();
    
    // Reset ledger data to prevent stale data issues
    ledgerModule.resetAllLedgers();
    
    // Clear IPO module
    ipoModule = null;
    
    // Reset module bridge
    moduleBridge.setPhase('lobby');
    
    console.log('✅ Game reset complete - all cache cleared');
    io.emit('gameStateUpdate', moduleBridge.getGameStateForClients());
  });

  // Join game
  socket.on('joinGame', (data) => {
    console.log('Join game request:', data);
    
    const participant = gameState.addParticipant(data.name, true);
    console.log('🔍 Participant created:', participant);
    
    if (participant) {
      // Initialize participant in ledger if ledger module is available
      if (ledgerModule) {
        console.log('🔍 Initializing participant in ledger...');
        const result = ledgerModule.initializeParticipant(
          participant.id,
          participant.name,
          participant.isHuman,
          participant.capital || 1000
        );
        console.log('🔍 Ledger initialization result:', result);
        console.log(`📊 Ledger initialized for ${participant.name} (${participant.id})`);
        console.log('🔍 Ledger size after initialization:', ledgerModule.ledgers.size);
      } else {
        console.log('❌ Ledger module not available!');
      }
      
      socket.emit('participantUpdate', participant);
      io.emit('gameStateUpdate', moduleBridge.getGameStateForClients());
    } else {
      console.log('❌ Failed to create participant');
    }
  });

  // Start game
  socket.on('startGame', async () => {
    console.log('🎮 Start game request received');
    console.log('🎮 Socket ID:', socket.id);
    console.log('🎮 Current phase:', gameState.getGameState().phase);
    
    const currentGame = gameState.getGameState();
    
    // Check if this is a phase advancement request (game already started)
    if (currentGame.phase !== 'lobby') {
      console.log('⏰ Phase advancement request detected, current phase:', currentGame.phase);
      console.log('⏰ Socket ID:', socket.id);
      
      // Use the existing phase advancement logic
      gameState.advanceToNextPhase(io, moduleBridge);
      return;
    }
    
    // Note: Phase will be set to 'ipo' after IPO module initialization
    console.log('🎮 Preparing to start game - will set phase to IPO after initialization');
    
    // Add AI bots first
    while (currentGame.participants.length < 12) {
      gameState.addParticipant(`Bot ${currentGame.participants.length}`, false);
    }
    
    // CRITICAL FIX: Only reset ledger if this is the first time starting the game
    // Once the game starts, the ledger should NEVER be reset until the game ends
    if (!currentGame.ledgerInitialized) {
      console.log('🔄 Resetting ledger for fresh game start...');
      ledgerModule.resetAllLedgers();
      console.log('✅ Ledger completely cleared - all participant IDs removed');
      
      // Re-initialize ALL participants in the ledger (human + AI bots)
      console.log('🔄 Re-initializing all participants in ledger...');
      for (const participant of currentGame.participants) {
        ledgerModule.initializeParticipant(
          participant.id,
          participant.name,
          participant.isHuman,
          participant.capital || 1000
        );
        console.log(`📊 Ledger re-initialized for ${participant.name} (${participant.id})`);
      }
      console.log(`✅ All ${currentGame.participants.length} participants re-initialized in ledger`);
      
      // Mark ledger as initialized for this game - NEVER reset again until game ends
      currentGame.ledgerInitialized = true;
      console.log('🔒 Ledger locked - no more resets until game ends');
    } else {
      console.log('🔒 Ledger already initialized for this game - preserving all data');
      console.log(`📊 Ledger contains ${ledgerModule.ledgers.size} participants with existing data`);
    }

    // Now validate we have enough participants (should always be true after adding AI bots)
    if (currentGame.participants.length < 2) {
      socket.emit('error', { message: 'Failed to add AI bots for game' });
      return;
    }

    // Debug: Check participants before starting IPO
    console.log('🔍 Participants before IPO start:');
    currentGame.participants.forEach(p => {
      console.log(`  - ${p.name} (${p.isHuman ? 'Human' : 'AI'}) - ID: ${p.id}`);
    });

    // Initialize IPO module with ledger so IPO can initialize participants without crashing
    ipoModule = new IPOModule(currentGame, io, 'shared_game', ledgerModule);
    
    // Give IPO module access to module bridge for ledger syncing
    ipoModule.moduleBridge = moduleBridge;
    
    // Update module bridge with IPO module
    moduleBridge.initializeModules(gameState, ipoModule, tradingModule, ledgerModule, botNameModule, io);
    
    console.log('✅ IPO module initialized and ready for API calls');
    
    // Start IPO phase with timer control
    if (ipoModule.startIPO()) {
      // Use new phase control system with automatic transitions
      gameState.setPhase('ipo', io, moduleBridge);
      console.log('✅ Game started - IPO phase active with automatic transitions');
    } else {
      socket.emit('error', { message: 'Failed to start IPO phase' });
    }
  });

  // Submit IPO bids
  socket.on('submitIPOBids', async (bidData, callback) => {
    console.log('🎯 IPO bids submitted:', bidData);
    console.log('🎯 Current game phase:', gameState.getGameState().phase);
    console.log('🎯 IPO module processing flag:', ipoModule?.isProcessing);
    
    // Initialize callback if not provided
    const ack = callback || (() => {});
    
    if (!ipoModule) {
      const errorMsg = 'IPO module not initialized';
      console.error('❌ ' + errorMsg);
      ack({ success: false, message: errorMsg });
      return;
    }

    const currentGame = gameState.getGameState();
    const humanParticipant = currentGame.participants.find(p => p.isHuman);
    
    if (!humanParticipant) {
      const errorMsg = 'Human participant not found';
      console.error('❌ ' + errorMsg);
      ack({ success: false, message: errorMsg });
      return;
    }

    console.log('🎯 Found human participant:', humanParticipant.name, humanParticipant.id);

    try {
      // Store human bids - don't process until timer expires
      const bidsStored = await ipoModule.storeHumanBids(bidData.bids, humanParticipant.id);
      
      if (bidsStored) {
        console.log(`✅ Stored ${bidData.bids.length} bids for ${humanParticipant.name}`);
        
        // Acknowledge the client
        ack({ 
          success: true, 
          message: 'Bids submitted successfully',
          bidsProcessed: bidData.bids.length
        });
        
        // Also emit an event in case other parts of the client are listening
        socket.emit('ipoBidsReceived', { 
          success: true,
          message: 'Bids submitted successfully - waiting for timer to expire',
          bidsProcessed: bidData.bids.length
        });
      } else {
        const errorMsg = 'Failed to store bids';
        console.error('❌ ' + errorMsg);
        ack({ success: false, message: errorMsg });
      }
    } catch (error) {
      console.error('❌ Error processing IPO bids:', error);
      ack({ 
        success: false, 
        message: error.message || 'An error occurred while processing your bids'
      });
    }
  });

  // Advance phase manually (triggered by frontend timer)
  socket.on('advancePhase', async () => {
    console.log('⏰ Manual phase advancement requested');
    console.log('⏰ Socket ID:', socket.id);
    const currentGame = gameState.getGameState();
    console.log('⏰ Current phase:', currentGame.phase);
    
    // If we're in IPO phase and it's not complete, process all bids first
    if (currentGame.phase === 'ipo' && ipoModule && !ipoModule.isProcessing) {
      console.log('🔄 IPO phase not complete - processing all bids now');
      await ipoModule.processAllBids();
    }
    
    // Use the existing phase advancement logic
    gameState.advanceToNextPhase(io, moduleBridge);
  });

  // Ready button for manual phase advancement
  socket.on('readyForNextPhase', async () => {
    console.log('🚀 User clicked Ready button - advancing to next phase');
    console.log('🚀 Socket ID:', socket.id);
    const currentGame = gameState.getGameState();
    console.log('🚀 Current phase:', currentGame.phase);
    
    // If we're in IPO phase, process all bids first
    if (currentGame.phase === 'ipo' && ipoModule && !ipoModule.isProcessing) {
      console.log('🔄 IPO phase - processing all bids now');
      await ipoModule.processAllBids();
      console.log('✅ IPO processing completed');
    }
    
    // Force advance to next phase regardless of completion check
    console.log('🚀 Force advancing to next phase...');
    gameState.advanceToNextPhase(io, moduleBridge);
  });

  // Manual trading control
  socket.on('startManualTrading', () => {
    console.log('🚀 Manual trading start requested');
    console.log('🚀 Socket ID:', socket.id);
    console.log('🚀 Current phase:', gameState.phase);
    
    // Start manual trading through module bridge
    moduleBridge.startManualTrading();
    
    // Emit trading started event
    io.emit('manualTradingStarted', { message: 'Manual trading activated' });
  });

  socket.on('stopManualTrading', () => {
    console.log('⏹️ Manual trading stop requested');
    console.log('⏹️ Socket ID:', socket.id);
    
    // Stop manual trading through module bridge
    moduleBridge.stopManualTrading();
    
    // Emit trading stopped event
    io.emit('manualTradingStopped', { message: 'Manual trading deactivated' });
  });

  // Submit trading order
  socket.on('submitTradingOrder', (orderData) => {
    console.log('Trading order submitted:', orderData);
    
    const result = moduleBridge.submitTradingOrder(
      orderData.participantId,
      orderData.companyId,
      orderData.orderType,
      orderData.shares,
      orderData.price
    );
    
    if (result.success) {
      socket.emit('tradingOrderReceived', { 
        message: 'Order submitted successfully',
        orderId: result.orderId
      });
      
      // Emit updated game state to all clients
      io.emit('gameStateUpdate', moduleBridge.getGameStateForClients());
    } else {
      socket.emit('error', { message: result.error });
    }
  });


  // Get market data
  socket.on('getMarketData', (data) => {
    const marketData = moduleBridge.getMarketData(data.companyId);
    socket.emit('marketDataUpdate', marketData);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    console.log('Socket disconnected at:', new Date().toLocaleTimeString());
  });
});

// API routes
app.get('/api/game', (req, res) => {
  const freshStart = req.query.fresh === 'true';
    if (freshStart) {
    console.log('🔄 Fresh start requested - resetting game state');
    gameState.resetGame();
    
    // Reset ledger data to prevent stale data issues
    ledgerModule.resetAllLedgers();
    
    // Properly re-initialize IPO module
    if (ipoModule) {
      ipoModule = null;
    }
    // Provide ledger module to IPO module to ensure initializeParticipant, recordPurchase, etc. are available
    ipoModule = new IPOModule(gameState, io, 'shared_game', ledgerModule);
    
    // Give IPO module access to module bridge for ledger syncing
    ipoModule.moduleBridge = moduleBridge;
    
    moduleBridge.initializeModules(gameState, ipoModule, tradingModule, ledgerModule, botNameModule, io);
    
    moduleBridge.setPhase('lobby');
    console.log('✅ Fresh start completed - all modules reset');
  }
  
  const gameData = moduleBridge.getGameStateForClients();
  res.json(gameData);
});

app.get('/api/market/:companyId', (req, res) => {
  const marketData = moduleBridge.getMarketData(req.params.companyId);
  res.json(marketData);
});

app.get('/api/prices', (req, res) => {
  const prices = moduleBridge.getAllPrices();
  res.json(prices);
});

app.get('/api/bridge/status', (req, res) => {
  res.json(moduleBridge.getStatus());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ledger', (req, res) => {
  const sessionId = req.query.session || 'shared_game';
  
  if (!ipoModule) {
    console.log('⚠️ /api/ledger called but IPO module not initialized yet');
    return res.status(404).json({ error: 'Game session not found - IPO module not initialized' });
  }
  
  const ledgerData = ipoModule.getLedgerData();
  const ceoData = ipoModule.getCEOData();
  
  console.log('📊 /api/ledger serving data for session:', sessionId);
  res.json({
    ledgers: ledgerData,
    ceos: ceoData,
    sessionId: sessionId
  });
});

app.post('/api/reset', (req, res) => {
  console.log('🔄 API Reset called - clearing all game data');
  
  // Reset game state
  const reset = gameState.resetGame();
  
  // Reset ledger data to prevent stale data issues
  ledgerModule.resetAllLedgers();
  
  // Clear IPO module
  ipoModule = null;
  
  // Reset module bridge
  moduleBridge.setPhase('lobby');
  
  // Emit reset to all clients
  io.emit('gameStateUpdate', moduleBridge.getGameStateForClients());
  
  console.log('✅ Game completely reset - fresh start ready');
  res.json({ status: 'reset', message: 'Game completely reset to fresh state' });
});

// API endpoint to clear ledger when entering lobby
app.post('/api/clear-ledger', (req, res) => {
  console.log('🧹 API clear-ledger called - preparing clean slate for new game');
  try {
    // Clear ledger completely - fresh start
    ledgerModule.resetAllLedgers();
    console.log('✅ Ledger completely cleared for fresh game start');
    
    res.json({ success: true, message: 'Ledger cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to clear ledger' });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(gameState.getStats());
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎮 Game ID: ${gameState.getGameState().id}`);
  console.log(`📊 Game Stats:`, gameState.getStats());
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});


