/**
 * Clean Architecture - Main Server
 * Complete multiplayer lemonade stand stock market game
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import our clean modules
const GameState = require('./core/GameState');
const IPO = require('./modules/IPO');
const Trading = require('./modules/Trading');
const AIBots = require('./modules/AIBots');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8080", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize clean architecture
const gameState = new GameState();
const ipo = new IPO(gameState);
const trading = new Trading(gameState);
const aiBots = new AIBots();

// Set up event listeners
gameState.on('stateChanged', (state) => {
  console.log('📊 State changed, notifying clients');
  io.emit('gameStateUpdate', state);
});

gameState.on('participantAdded', (data) => {
  console.log(`👤 Participant added: ${data.participant.name}`);
});

gameState.on('phaseChanged', (data) => {
  console.log(`🔄 Phase changed: ${data.oldPhase} → ${data.phase}`);
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

app.get('/api/game', (req, res) => {
  res.json(gameState.getState());
});

app.post('/api/participant', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  const participantId = gameState.addParticipant({ 
    name, 
    isHuman: true 
  });
  
  res.json({ 
    success: true, 
    message: 'Participant added',
    participantId 
  });
});

app.post('/api/start-game', (req, res) => {
  try {
    console.log('🚀 Starting new game...');
    
    // Clear existing state
    gameState.state.participants.clear();
    gameState.state.companies.clear();
    gameState.state.orders.clear();
    gameState.state.trades.clear();
    gameState.state.currentPrices.clear();
    
    // Add human participants (from WebSocket connections)
    const humanParticipants = Array.from(io.sockets.sockets.values())
      .filter(socket => socket.participantName)
      .map(socket => ({
        name: socket.participantName,
        isHuman: true
      }));
    
    // Add AI bots
    const aiBotParticipants = aiBots.generateBotsForGame(8);
    
    // Add all participants
    const allParticipants = [...humanParticipants, ...aiBotParticipants];
    allParticipants.forEach(participant => {
      gameState.addParticipant(participant);
    });
    
    // Add companies (4 lemonade stands)
    const companies = [
      { name: 'Lemonade Stand A', currentPrice: 1.50 },
      { name: 'Lemonade Stand B', currentPrice: 2.00 },
      { name: 'Lemonade Stand C', currentPrice: 1.75 },
      { name: 'Lemonade Stand D', currentPrice: 1.25 }
    ];
    
    companies.forEach(company => {
      gameState.addCompany(company);
    });
    
    // Start IPO phase
    ipo.startIPO();
    
    res.json({ 
      success: true, 
      message: 'Game started',
      participants: allParticipants.length,
      companies: companies.length
    });
    
  } catch (error) {
    console.error('❌ Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

app.post('/api/ipo-bids', (req, res) => {
  const { bids, participantId } = req.body;
  
  if (!bids || !participantId) {
    return res.status(400).json({ error: 'Bids and participantId required' });
  }
  
  ipo.processHumanBids(bids, participantId)
    .then(success => {
      if (success) {
        res.json({ success: true, message: 'Bids processed' });
      } else {
        res.status(400).json({ error: 'Failed to process bids' });
      }
    })
    .catch(error => {
      console.error('❌ Error processing IPO bids:', error);
      res.status(500).json({ error: 'Failed to process bids' });
    });
});

app.post('/api/trade/buy', (req, res) => {
  const { participantId, companyId, shares, price, orderType } = req.body;
  
  if (!participantId || !companyId || !shares || !price) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const result = trading.submitBuyOrder(participantId, companyId, shares, price, orderType);
  res.json(result);
});

app.post('/api/trade/sell', (req, res) => {
  const { participantId, companyId, shares, price, orderType } = req.body;
  
  if (!participantId || !companyId || !shares || !price) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const result = trading.submitSellOrder(participantId, companyId, shares, price, orderType);
  res.json(result);
});

app.post('/api/phase', (req, res) => {
  const { phase } = req.body;
  if (!phase) {
    return res.status(400).json({ error: 'Phase required' });
  }

  gameState.setPhase(phase);
  
  // Start trading if phase is trading
  if (phase === 'trading') {
    trading.startTrading();
  }
  
  res.json({ success: true, message: `Phase changed to ${phase}` });
});

app.get('/api/market/:companyId', (req, res) => {
  const { companyId } = req.params;
  const marketData = trading.getMarketData(companyId);
  
  if (!marketData) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  res.json(marketData);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Send current state to new client
  socket.emit('gameStateUpdate', gameState.getState());
  
  socket.on('join-game', (data) => {
    const { name } = data;
    if (name) {
      socket.participantName = name;
      socket.participantId = gameState.addParticipant({ 
        name, 
        isHuman: true 
      });
      console.log(`👤 ${name} joined the game`);
      
      // Send updated state to all clients
      io.emit('gameStateUpdate', gameState.getState());
    }
  });
  
  socket.on('submit-ipo-bids', (data) => {
    const { bids } = data;
    if (socket.participantId && bids) {
      ipo.processHumanBids(bids, socket.participantId);
    }
  });
  
  socket.on('submit-buy-order', (data) => {
    const { companyId, shares, price, orderType } = data;
    if (socket.participantId) {
      trading.submitBuyOrder(socket.participantId, companyId, shares, price, orderType);
    }
  });
  
  socket.on('submit-sell-order', (data) => {
    const { companyId, shares, price, orderType } = data;
    if (socket.participantId) {
      trading.submitSellOrder(socket.participantId, companyId, shares, price, orderType);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    // Note: In a real game, you might want to handle participant removal
  });
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Clean Architecture Game Server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} to play`);
  console.log(`📊 Game features:`);
  console.log(`   ✅ Dutch auction IPO system`);
  console.log(`   ✅ Real-time trading with AI bots`);
  console.log(`   ✅ 15 different bot personalities`);
  console.log(`   ✅ Market maker for liquidity`);
  console.log(`   ✅ Clean architecture - no circular references`);
  console.log(`   ✅ Scalable multiplayer support`);
});
