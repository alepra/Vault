/**
 * Robust Stock Exchange Game Server
 * Complete neighborhood stock exchange with IPO, trading, and market makers
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import our modules
const GameEngine = require('./core/GameEngine');
const IPOManager = require('./modules/IPOManager');
const TradingManager = require('./modules/TradingManager');
const BotManager = require('./modules/BotManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8080", "http://localhost:3003"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize game components
const gameEngine = new GameEngine();
const ipoManager = new IPOManager(gameEngine);
const tradingManager = new TradingManager(gameEngine);
const botManager = new BotManager(gameEngine);

// Set up event listeners
gameEngine.on('stateChanged', (state) => {
  console.log('📊 Game state changed, notifying clients');
  io.emit('gameStateUpdate', state);
});

gameEngine.on('participantAdded', (data) => {
  console.log(`👤 Participant added: ${data.participant.name}`);
});

gameEngine.on('phaseChanged', (data) => {
  console.log(`🔄 Phase changed: ${data.oldPhase} → ${data.phase}`);
  
  // Handle phase-specific logic
  if (data.phase === 'trading') {
    // Create market maker orders for all companies
    for (const [companyId, company] of gameEngine.state.companies) {
      tradingManager.createMarketMakerOrders(companyId);
    }
    
    // Start bot trading
    startBotTrading();
  }
});

// Bot trading interval
let botTradingInterval = null;

function startBotTrading() {
  if (botTradingInterval) {
    clearInterval(botTradingInterval);
  }
  
  botTradingInterval = setInterval(() => {
    if (gameEngine.state.phase === 'trading') {
      const decisions = botManager.makeTradingDecisions();
      botManager.executeBotDecisions(decisions, tradingManager);
    }
  }, 5000); // Bot trading every 5 seconds
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    phase: gameEngine.state.phase,
    participants: gameEngine.state.participants.size,
    companies: gameEngine.state.companies.size
  });
});

app.get('/api/game', (req, res) => {
  try {
    const state = gameEngine.getState();
    res.json(state);
  } catch (error) {
    console.error('❌ Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state', details: error.message });
  }
});

// Participant management
app.post('/api/participant', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  const participantId = gameEngine.addParticipant({ name });
  res.json({ success: true, participantId, message: 'Participant added' });
});

// Company management
app.post('/api/company', (req, res) => {
  const { name, ipoPrice } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  const companyId = gameEngine.addCompany({ name, ipoPrice: ipoPrice || 1.50 });
  res.json({ success: true, companyId, message: 'Company added' });
});

// IPO management
app.post('/api/ipo/start', (req, res) => {
  const { companyId, startingPrice } = req.body;
  
  const result = ipoManager.startIPO(companyId, startingPrice);
  if (result.success) {
    res.json({ success: true, message: 'IPO started' });
  } else {
    res.status(400).json({ error: result.error });
  }
});

app.post('/api/ipo/bid', (req, res) => {
  const { companyId, participantId, price, shares } = req.body;
  
  if (!companyId || !participantId || !price || !shares) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate participant exists
  const participant = gameEngine.state.participants.get(participantId);
  if (!participant) {
    return res.status(400).json({ error: 'Participant not found' });
  }

  // Validate company exists
  const company = gameEngine.state.companies.get(companyId);
  if (!company) {
    return res.status(400).json({ error: 'Company not found' });
  }

  // In Dutch auction, we don't check cash until clearing price is determined
  // Participants can bid any amount, but only pay the clearing price if successful

  // Store the bid (don't execute transaction yet)
  const bidId = gameEngine.generateId();
  const bid = {
    id: bidId,
    participantId,
    companyId,
    price,
    shares,
    timestamp: Date.now()
  };

  // Store bid in a temporary bids collection
  if (!gameEngine.state.ipoBids) {
    gameEngine.state.ipoBids = new Map();
  }
  gameEngine.state.ipoBids.set(bidId, bid);

  console.log(`📝 IPO bid placed: ${participant.name} bids ${shares} shares at $${price} for ${company.name}`);
  
  res.json({ success: true, message: 'Bid placed', bidId });
});

app.post('/api/ipo/process', (req, res) => {
  const { companyId } = req.body;
  
  // Get all bids for this company from stored bids
  const humanBids = Array.from(gameEngine.state.ipoBids?.values() || [])
    .filter(bid => bid.companyId === companyId);

  // Generate AI bids
  const aiBidsResult = ipoManager.generateAIBids(companyId);
  if (!aiBidsResult.success) {
    return res.status(400).json({ error: 'Failed to generate AI bids' });
  }

  // Combine human and AI bids
  const allBids = [...humanBids, ...aiBidsResult.bids];
  
  if (allBids.length === 0) {
    return res.status(400).json({ error: 'No bids found for this company' });
  }

  console.log(`📊 Processing IPO for company ${companyId} with ${allBids.length} bids (${humanBids.length} human, ${aiBidsResult.bids.length} AI)`);

  const result = ipoManager.processDutchAuction(companyId, allBids);
  if (result.success) {
    // Execute all transactions
    console.log(`🔄 Executing ${result.transactions.length} transactions for ${companyId}`);
    for (const transaction of result.transactions) {
      console.log(`🔄 Executing transaction:`, transaction);
      const execResult = gameEngine.executeTransaction(transaction);
      console.log(`🔄 Transaction result:`, execResult);
    }

    // Determine CEO
    ipoManager.determineCEO(companyId);

    // Clear processed bids
    for (const bid of humanBids) {
      gameEngine.state.ipoBids.delete(bid.id);
    }

    // DEBUG: Log the company data after IPO processing
    const company = gameEngine.state.companies.get(companyId);
    console.log(`🔍 DEBUG: Company ${company.name} after IPO:`);
    console.log(`  IPO Price: $${company.ipoPrice}`);
    console.log(`  Current Price: $${company.currentPrice}`);
    console.log(`  Shares Allocated: ${company.sharesAllocated}`);
    console.log(`  CEO: ${company.ceo}`);

    // Send updated state to all clients
    try {
      const updatedState = gameEngine.getState();
      console.log(`🔍 DEBUG: Sending updated state to clients:`, JSON.stringify(updatedState.companies, null, 2));
      io.emit('gameStateUpdate', updatedState);
    } catch (error) {
      console.error('❌ Error getting game state for IPO processing:', error);
      // Continue with the response even if state update fails
    }

    res.json({
      success: true,
      clearingPrice: result.clearingPrice,
      totalShares: result.totalShares,
      message: 'IPO processed'
    });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// Trading management
app.post('/api/trade/buy', (req, res) => {
  const { participantId, companyId, shares, maxPrice } = req.body;
  
  const result = tradingManager.placeBuyOrder(participantId, companyId, shares, maxPrice);
  if (result.success) {
    res.json({ success: true, message: 'Buy order placed' });
  } else {
    res.status(400).json({ error: result.error });
  }
});

app.post('/api/trade/sell', (req, res) => {
  const { participantId, companyId, shares, minPrice } = req.body;
  
  const result = tradingManager.placeSellOrder(participantId, companyId, shares, minPrice);
  if (result.success) {
    res.json({ success: true, message: 'Sell order placed' });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// Phase management
app.post('/api/phase', (req, res) => {
  const { phase } = req.body;
  if (!phase) {
    return res.status(400).json({ error: 'Phase required' });
  }

  gameEngine.setPhase(phase);
  
  // If moving to IPO phase, start IPO for all companies
  if (phase === 'ipo') {
    console.log('🚀 Starting IPO phase - waiting for human bids...');
    const companies = Array.from(gameEngine.state.companies.values());
    for (const company of companies) {
      ipoManager.startIPO(company.id, 1.00); // Just set minimum price, no pre-set IPO price
    }
  }
  
  res.json({ success: true, message: `Phase changed to ${phase}` });
});

// Game initialization
app.post('/api/game/init', (req, res) => {
  // Create companies (NO pre-set IPO prices - determined by Dutch auction)
  const companies = [
    { name: 'Lemonade Stand Alpha' },
    { name: 'Lemonade Stand Beta' },
    { name: 'Lemonade Stand Gamma' },
    { name: 'Lemonade Stand Delta' }
  ];

  const companyIds = companies.map(company => gameEngine.addCompany(company));

  // Create AI bots
  const bots = botManager.createBots(8);

  res.json({ 
    success: true, 
    message: 'Game initialized',
    companies: companyIds,
    bots: bots.length
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Send current state to new client
  socket.emit('gameStateUpdate', gameEngine.getState());
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Initialize game with test data
function initializeGame() {
  console.log('🚀 Initializing Robust Stock Exchange Game...');
  
  // Create companies (NO pre-set IPO prices - determined by Dutch auction)
  const companies = [
    { name: 'Lemonade Stand Alpha' },
    { name: 'Lemonade Stand Beta' },
    { name: 'Lemonade Stand Gamma' },
    { name: 'Lemonade Stand Delta' }
  ];

  companies.forEach(company => {
    gameEngine.addCompany(company);
  });

  // Create AI bots
  botManager.createBots(8);

  console.log('✅ Game initialized with 4 companies and 8 AI bots');
}

// Start server
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`🚀 Robust Stock Exchange Server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} to play`);
  
  initializeGame();
});
