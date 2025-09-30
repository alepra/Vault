const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import game modules
const TradingModule = require('./modules/tradingModule');
const IPOModule = require('./modules/ipoModule');
const LedgerModule = require('./modules/ledgerModule');
const BotNameModule = require('./modules/botNameModule');
const EventStoreIntegration = require('./modules/eventStoreIntegration');

// ============================================
// GLOBAL STATE - Declared once at the top
// ============================================
const gameStates = {};
const sessionIPO = {};
const sessionTrading = {};
let currentGame = null;
let gameTimer = null;

// Module instances
const ledgerModule = new LedgerModule();
const eventStoreIntegration = new EventStoreIntegration();

// ============================================
// EXPRESS & SOCKET.IO SETUP
// ============================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Security headers (without forcing JSON content-type)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'game.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

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
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_human BOOLEAN DEFAULT 0,
    personality TEXT,
    capital REAL DEFAULT 1000,
    remaining_capital REAL DEFAULT 1000,
    total_spent REAL DEFAULT 0,
    is_ceo BOOLEAN DEFAULT 0,
    ceo_company_id TEXT,
    FOREIGN KEY (game_id) REFERENCES games (id)
  )`);

  // Companies table
  db.run(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    shares INTEGER DEFAULT 1000,
    total_shares_allocated INTEGER DEFAULT 0,
    current_price REAL DEFAULT 2.50,
    ipo_price REAL DEFAULT 2.50,
    price REAL DEFAULT 1.50,
    quality INTEGER DEFAULT 5,
    marketing REAL DEFAULT 0.10,
    ceo_id TEXT,
    ceo_salary REAL DEFAULT 0.10,
    FOREIGN KEY (game_id) REFERENCES games (id)
  )`);

  // Shares table
  db.run(`CREATE TABLE IF NOT EXISTS shares (
    participant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    shares INTEGER DEFAULT 0,
    PRIMARY KEY (participant_id, company_id),
    FOREIGN KEY (participant_id) REFERENCES participants (id),
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )`);

  // Trades table
  db.run(`CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    shares INTEGER NOT NULL,
    price REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (company_id) REFERENCES companies (id),
    FOREIGN KEY (buyer_id) REFERENCES participants (id),
    FOREIGN KEY (seller_id) REFERENCES participants (id)
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL,
    shares INTEGER NOT NULL,
    price REAL NOT NULL,
    filled BOOLEAN DEFAULT 0,
    filled_shares INTEGER DEFAULT 0,
    filled_price REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id),
    FOREIGN KEY (participant_id) REFERENCES participants (id),
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )`);

  // News table
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    impact TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id)
  )`);
});

// Initialize Event Store Integration
(async () => {
  try {
    console.log('🚀 Initializing Event Store Integration...');
    const success = await eventStoreIntegration.initialize(ledgerModule, null, null);
    if (success) {
      console.log('✅ Event Store Integration: Ready');
    } else {
      console.log('⚠️ Event Store Integration: Using legacy system');
    }
  } catch (error) {
    console.error('❌ Event Store Integration Error:', error);
  }
})();

// Bot personalities - Pool of 20+ bots for random selection
const botPersonalities = [
  // Aggressive/High Risk Bots
  { name: 'Aggressive', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.3, bidStrategy: 'high' },
  { name: 'Growth Focused', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.4, bidStrategy: 'high' },
  { name: 'Short-term Trader', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.5, bidStrategy: 'high' },
  { name: 'Momentum Chaser', riskTolerance: 0.9, concentration: 0.8, bidMultiplier: 1.6, bidStrategy: 'high' },
  { name: 'High Roller', riskTolerance: 0.95, concentration: 0.6, bidMultiplier: 1.8, bidStrategy: 'high' },
  
  // Conservative/Low Risk Bots
  { name: 'Conservative', riskTolerance: 0.3, concentration: 0.5, bidMultiplier: 0.8, bidStrategy: 'low' },
  { name: 'Value Investor', riskTolerance: 0.5, concentration: 0.75, bidMultiplier: 0.6, bidStrategy: 'low' },
  { name: 'Risk Averse', riskTolerance: 0.2, concentration: 0.5, bidMultiplier: 0.7, bidStrategy: 'low' },
  { name: 'Safe Haven', riskTolerance: 0.1, concentration: 0.4, bidMultiplier: 0.5, bidStrategy: 'low' },
  { name: 'Cautious', riskTolerance: 0.4, concentration: 0.6, bidMultiplier: 0.9, bidStrategy: 'low' },
  
  // CEO/Concentrated Bots
  { name: 'Concentrated', riskTolerance: 0.9, concentration: 0.25, bidMultiplier: 2.0, bidStrategy: 'ceo' },
  { name: 'Control Freak', riskTolerance: 0.95, concentration: 0.2, bidMultiplier: 2.2, bidStrategy: 'ceo' },
  { name: 'Dominator', riskTolerance: 0.85, concentration: 0.3, bidMultiplier: 1.9, bidStrategy: 'ceo' },
  
  // Medium/Balanced Bots
  { name: 'Diversified', riskTolerance: 0.6, concentration: 1.0, bidMultiplier: 1.0, bidStrategy: 'medium' },
  { name: 'Momentum Trader', riskTolerance: 0.7, concentration: 0.75, bidMultiplier: 1.2, bidStrategy: 'medium' },
  { name: 'Opportunistic', riskTolerance: 0.6, concentration: 0.75, bidMultiplier: 1.1, bidStrategy: 'medium' },
  { name: 'Quality Focused', riskTolerance: 0.5, concentration: 0.75, bidMultiplier: 1.0, bidStrategy: 'medium' },
  { name: 'Balanced', riskTolerance: 0.6, concentration: 0.8, bidMultiplier: 1.1, bidStrategy: 'medium' },
  { name: 'Steady Eddie', riskTolerance: 0.5, concentration: 0.7, bidMultiplier: 1.0, bidStrategy: 'medium' },
  { name: 'Market Timer', riskTolerance: 0.7, concentration: 0.6, bidMultiplier: 1.3, bidStrategy: 'medium' },
  
  // Scavenger Bots (ALWAYS included for liquidity)
  { name: 'Scavenger 1', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' },
  { name: 'Scavenger 2', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' },
  { name: 'Scavenger 3', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' }
];

// Game state management (already declared at top - removing duplicates)

// Utility functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function mapPrice(level) {
  return 0.75 + (2.25 - 0.75) * ((level - 1) / 9);
}

function mapCost(level) {
  return 0.50 + (2.00 - 0.50) * ((level - 1) / 9);
}

function calculateWeatherMultiplier(weather) {
  switch (weather) {
    case 'hot': return 1.4;
    case 'cold': return 0.6;
    case 'rainy': return 0.4;
    default: return 1.0;
  }
}

function calculateEconomyMultiplier(economy) {
  switch (economy) {
    case 'good': return 1.2;
    case 'bad': return 0.8;
    default: return 1.0;
  }
}

function calculateReputationPenalty(priceLevel, qualityLevel) {
  const price = mapPrice(priceLevel);
  const quality = qualityLevel;
  const fairPrice = 1.50 + (quality - 5) * 0.15;
  const gougingRatio = price / Math.max(fairPrice, 0.01);
  
  if (gougingRatio > 1.5) {
    const penalty = Math.min(0.8, (gougingRatio - 1.5) * 0.4);
    return 1.0 - penalty;
  }
  
  if (gougingRatio < 0.8) {
    const bonus = Math.min(0.3, (0.8 - gougingRatio) * 0.2);
    return 1.0 + bonus;
  }
  
  return 1.0;
}

function calculateMarketingEffectiveness(marketingPct) {
  if (marketingPct <= 0.2) {
    return marketingPct / 0.2;
  }
  const extra = (marketingPct - 0.2) / 0.2;
  return 1.0 + (0.4 * extra);
}

// Game state functions
async function createGame() {
  const gameId = generateId();
  const game = {
    id: gameId,
    phase: 'lobby',
    turn: 0,
    maxTurns: 100,
    turnLength: 30,
    participants: [],
    companies: [],
    trades: [],
    news: [],
    weather: 'normal',
    economy: 'normal'
  };

  // Create companies
  for (let i = 1; i <= 4; i++) {
    const company = {
      id: generateId(),
      name: `Lemonade Stand ${i}`,
      shares: 1000,
      totalSharesAllocated: 0,
      currentPrice: 2.50,
      ipoPrice: 2.50,
      price: 1.50,
      quality: 5,
      marketing: 0.10,
      ceoId: null,
      ceoSalary: 0.10,
      performance: {
        unitsSold: 0,
        revenue: 0,
        ingredientCost: 0,
        marketingSpend: 0,
        profit: 0,
        marketShare: 0
      }
    };
    game.companies.push(company);
  }

  currentGame = game;
  return game;
}

async function addParticipant(name, isHuman = true, botType = 'standard') {
  // legacy add to global game
  if (!currentGame) return null;
  return await addParticipantToGame(currentGame, name, isHuman, botType);
}

async function addParticipantToGame(game, name, isHuman = true, botType = 'standard', personality = null) {
  if (!game) return null;
  const participant = {
    id: generateId(),
    name,
    isHuman,
    botType: isHuman ? null : botType,
    personality: isHuman ? null : (personality || botPersonalities[Math.floor(Math.random() * botPersonalities.length)]),
    capital: 1000,
    remainingCapital: 1000,
    shares: {},
    totalSpent: 0,
    isCEO: false,
    ceoCompanyId: null
  };
  game.participants.push(participant);
  
  // Initialize participant in Event Store
  if (eventStoreIntegration.isEventStoreEnabled()) {
    try {
      await eventStoreIntegration.initializeParticipant(participant.id, participant.name, participant.isHuman, 1000);
      console.log(`📊 EventStore: Participant ${participant.name} initialized`);
    } catch (error) {
      console.error('❌ EventStore: Failed to initialize participant:', error);
    }
  }
  
  return participant;
}

async function startGameForSession(sessionId) {
  const game = gameStates[sessionId];
  if (!game) return;
  
  // Add enough bots to reach 10 total participants (including humans)
  const humanCount = game.participants.filter(p => p.isHuman).length;
  const botsNeeded = 10 - humanCount;
  
  // Separate scavenger bots from other bots
  const scavengerBots = botPersonalities.filter(bot => bot.bidStrategy === 'scavenger');
  const otherBots = botPersonalities.filter(bot => bot.bidStrategy !== 'scavenger');
  
  // Always add ALL 3 scavenger bots first (they're essential for liquidity)
  for (let i = 0; i < Math.min(3, botsNeeded) && i < scavengerBots.length; i++) {
    const bot = scavengerBots[i];
    addParticipantToGame(game, bot.name, false, 'standard', bot);
  }
  
  // Randomly select remaining bots from the pool
  const remainingBotsNeeded = botsNeeded - Math.min(3, scavengerBots.length);
  const shuffledBots = [...otherBots].sort(() => Math.random() - 0.5); // Shuffle the array
  
  for (let i = 0; i < remainingBotsNeeded && i < shuffledBots.length; i++) {
    const bot = shuffledBots[i];
    addParticipantToGame(game, bot.name, false, 'standard', bot);
  }
  
  // Initialize ledger module with participants (only if not already initialized)
  if (ledgerModule.ledgers.size === 0) {
    ledgerModule.initializeLedgers(game.participants);
    console.log(`📊 Ledger module initialized for ${game.participants.length} participants`);
  } else {
    console.log(`📊 Ledger module already initialized with ${ledgerModule.ledgers.size} participants - skipping reset`);
  }
  
  // Set random weather
  const weatherOptions = ['sunny', 'rainy', 'hot', 'cloudy'];
  game.weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
  
  console.log(`Game[${sessionId}] started with ${game.participants.length} participants, weather: ${game.weather}`);
  game.phase = 'ipo';
  game.startTime = new Date();
  
  // Create IPO module for this session
  if (!sessionIPO[sessionId]) {
    sessionIPO[sessionId] = new IPOModule(gameStates[sessionId], io, sessionId, ledgerModule, eventStoreIntegration);
    console.log(`📊 IPO module created for session: ${sessionId}`);
  }
}

async function processHumanIPOBidsForSession(sessionId, humanBids) {
  const game = gameStates[sessionId];
  if (!game || !humanBids) return;
  
  // Find human participant
  const humanParticipant = game.participants.find(p => p.isHuman);
  if (!humanParticipant) return;
  
  // Use the IPO module to process human bids properly
  const ipoModule = sessionIPO[sessionId];
  if (ipoModule) {
    console.log('🔄 Using IPO module to process human bids and complete Dutch auction:', sessionId);
    // Convert humanBids to the format expected by IPO module
    const formattedBids = humanBids.map(bid => ({
      companyId: bid.companyId,
      shares: bid.shares,
      price: bid.price
    }));
    
    // Let the IPO module handle everything - it will process human bids and then AI bids
    await ipoModule.processHumanBids(formattedBids, humanParticipant.id);
  } else {
    console.log('❌ No IPO module found for session:', sessionId);
  }
}

async function runIPOForSession(sessionId) {
  const game = gameStates[sessionId];
  if (!game) return;

  // Generate bids for each company
  for (const company of game.companies) {
    const bids = [];
    
    for (const participant of game.participants) {
      if (participant.personality) {
        const personality = participant.personality;
        const companiesToBidOn = Math.max(1, Math.min(4, Math.ceil(personality.concentration * 4)));
        
        // Scavengers always bid on all companies, others have 70% chance
        const shouldBid = personality.bidStrategy === 'scavenger' ? true : (Math.random() < 0.7);
        if (shouldBid) {
          let bidPrice;
          if (personality.bidStrategy === 'scavenger') {
            bidPrice = 1.00 + (Math.random() * 0.5);
          } else if (personality.bidStrategy === 'ceo') {
            bidPrice = 2.50 + (Math.random() * 1.5);
          } else if (personality.bidStrategy === 'low') {
            bidPrice = 1.00 + (Math.random() * 0.5);
          } else if (personality.bidStrategy === 'high') {
            bidPrice = 2.25 + (Math.random() * 1.0);
          } else {
            bidPrice = 1.50 + (Math.random() * 0.75);
          }
          
          bidPrice = Math.round(bidPrice * 4) / 4;
          bidPrice = Math.max(bidPrice, 1.00);
          
          // Use the personality's bidMultiplier and concentration properly
          const baseShares = Math.floor((participant.capital * personality.riskTolerance * personality.bidMultiplier) / bidPrice);
          const sharesToBid = Math.max(100, baseShares);
          const bidAmount = sharesToBid * bidPrice;
          
          if (bidAmount <= participant.capital) {
            bids.push({
              participantId: participant.id,
              price: bidPrice,
              shares: sharesToBid,
              amount: bidAmount
            });
          }
        }
      }
    }

    // Calculate clearing price (Dutch auction)
    bids.sort((a, b) => b.price - a.price);
    
    let totalShares = 0;
    let clearingPrice = 1.00;
    
    for (const bid of bids) {
      totalShares += bid.shares;
      if (totalShares >= company.shares) {
        clearingPrice = bid.price;
        break;
      }
    }
    
    if (totalShares < company.shares) {
      clearingPrice = bids[bids.length - 1]?.price || 1.00;
    }

    company.finalPrice = clearingPrice;
    company.currentPrice = clearingPrice;
    company.ipoPrice = clearingPrice;

    // Allocate shares
    let remainingShares = company.shares;
    for (const bid of bids) {
      if (remainingShares > 0 && bid.price >= clearingPrice) {
        const sharesToAllocate = Math.min(bid.shares, remainingShares);
        const participant = game.participants.find(p => p.id === bid.participantId);
        
        if (participant) {
          if (!participant.shares[company.id]) {
            participant.shares[company.id] = 0;
          }
          participant.shares[company.id] += sharesToAllocate;
          participant.totalSpent = (participant.totalSpent || 0) + (clearingPrice * sharesToAllocate);
          participant.remainingCapital = participant.capital - participant.totalSpent;
          
          remainingShares -= sharesToAllocate;
          company.totalSharesAllocated += sharesToAllocate;
        }
      }
    }

    // Check for CEO
    for (const participant of game.participants) {
      const shares = participant.shares[company.id] || 0;
      const percentage = (shares / company.shares) * 100;
      
      if (percentage >= 35) {
        participant.isCEO = true;
        participant.ceoCompanyId = company.id;
        company.ceoId = participant.id;
        break;
      }
    }
  }

  // Don't change phase here - let the IPO module handle phase transitions
  // game.phase = 'newspaper';
  // io.to(sessionId).emit('gameStateUpdate', game);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Each client gets their own game state
  socket.gameState = null;

  socket.on('joinGame', async (data) => {
    const sessionId = data.sessionId || 'default';
    
    // Get or create game state for this session
    if (!gameStates[sessionId]) {
      gameStates[sessionId] = await createGame();
    }
    
    socket.gameState = gameStates[sessionId];
    socket.sessionId = sessionId;
    socket.join(sessionId);

    const participant = await addParticipantToGame(socket.gameState, data.name, true);
    if (participant) {
      console.log('📊 Participant created:', participant);
      socket.emit('participantUpdate', participant);
      socket.emit('gameStateUpdate', socket.gameState); // Only to this client
    } else {
      console.log('❌ Failed to create participant');
    }
  });

  socket.on('startGame', async () => {
    console.log('🚀 Start game request received from socket:', socket.id);
    console.log('🔍 Socket sessionId:', socket.sessionId);
    console.log('🔍 Available game states:', Object.keys(gameStates));
    console.log('🔍 Socket connected:', socket.connected);
    console.log('🔍 Socket rooms:', Array.from(socket.rooms));
    
    if (gameStates[socket.sessionId]) {
      console.log('✅ Starting game for session:', socket.sessionId);
      await startGameForSession(socket.sessionId);
      console.log('📊 Game state after start:', gameStates[socket.sessionId]);
      io.to(socket.sessionId).emit('gameStateUpdate', gameStates[socket.sessionId]);
    } else {
      console.log('❌ No game state found for session:', socket.sessionId);
    }
  });

  socket.on('submitIPOBids', async (bidData) => {
    // Handle IPO bidding
    console.log('📤 IPO bids submitted:', bidData);
    console.log('🔍 Socket sessionId:', socket.sessionId);
    console.log('🔍 Game state phase:', socket.gameState?.phase);
    
    // Fix: Ensure sessionId is set if it's undefined
    if (!socket.sessionId) {
      socket.sessionId = 'shared_game';
      console.log('🔧 Fixed undefined sessionId, set to:', socket.sessionId);
    }
    
    // Fix: Ensure gameState is set if it's undefined
    if (!socket.gameState && gameStates[socket.sessionId]) {
      socket.gameState = gameStates[socket.sessionId];
      console.log('🔧 Fixed undefined gameState, set to:', socket.gameState?.phase);
    }
    
    if (socket.gameState && socket.gameState.phase === 'ipo') {
      // Process human bids first (this will automatically trigger AI bids after 5 seconds)
      console.log('🔄 Processing human IPO bids for session:', socket.sessionId);
      await processHumanIPOBidsForSession(socket.sessionId, bidData.bids);
      
      // Emit confirmation that bids were received
      socket.emit('ipoBidsReceived', { message: 'Bids received - processing AI bids and completing IPO...' });
      
      // Wait for IPO completion and then emit final confirmation
      setTimeout(() => {
        console.log('🔍 Checking IPO completion after 6 seconds...');
        console.log('🔍 Game state phase:', gameStates[socket.sessionId]?.phase);
        if (gameStates[socket.sessionId] && (gameStates[socket.sessionId].phase === 'newspaper' || gameStates[socket.sessionId].phase === 'trading')) {
          socket.emit('ipoCompleted', { message: 'IPO completed - moving to next phase!' });
        } else {
          console.log('❌ IPO not completed - phase still:', gameStates[socket.sessionId]?.phase);
        }
      }, 6000); // Wait 6 seconds to ensure IPO completion
    }
  });

  socket.on('skipIPO', async () => {
    // Handle skipping IPO
    console.log('User skipped IPO');
    
    if (socket.gameState && socket.gameState.phase === 'ipo') {
      // Get or create IPO module for this session
      if (!sessionIPO[socket.sessionId]) {
        sessionIPO[socket.sessionId] = new IPOModule(gameStates[socket.sessionId], io, socket.sessionId, ledgerModule, eventStoreIntegration);
      }
      
      // Use IPO module to skip IPO (AI bots only)
      await sessionIPO[socket.sessionId].skipIPO();
      
      // Emit updated game state
      io.to(socket.sessionId).emit('gameStateUpdate', gameStates[socket.sessionId]);
      
      socket.emit('ipoSkipped', { message: 'Skipped IPO - AI bots bid automatically - moving to trading phase' });
    }
  });

  socket.on('readyForNextPhase', () => {
    // Handle Ready button clicks for manual phase advancement
    console.log('🚀 User clicked Ready button - advancing to next phase');
    
    // Fix: Ensure sessionId is set if it's undefined
    if (!socket.sessionId) {
      socket.sessionId = 'shared_game';
      console.log('🔧 Fixed undefined sessionId for Ready button, set to:', socket.sessionId);
    }
    
    const game = gameStates[socket.sessionId];
    if (game) {
      console.log(`🔍 Current phase: ${game.phase}, advancing to next phase`);
      
      // Manual phase advancement logic
      if (game.phase === 'newspaper') {
        game.phase = 'trading';
        console.log('✅ Advanced from newspaper to trading phase');
        
        // Create trading engine if it doesn't exist
        if (!sessionTrading[socket.sessionId]) {
          console.log('🔧 Creating trading engine for session');
          sessionTrading[socket.sessionId] = new TradingModule();
          sessionTrading[socket.sessionId].ledgerModule = ledgerModule;
          ledgerModule.setTradingModule(sessionTrading[socket.sessionId]);
          
          // Set up tradesExecuted event handler
          console.log(`🔧 Setting up tradesExecuted event handler for session: ${socket.sessionId}`);
          sessionTrading[socket.sessionId].on('tradesExecuted', (payload) => {
            console.log(`📊 Processing ${payload.trades.length} trades through ledger...`);
            
            // Process each trade through the ledger
            payload.trades.forEach(trade => {
              try {
                const buyerLedger = ledgerModule.ledgers.get(trade.buyerId);
                const sellerLedger = ledgerModule.ledgers.get(trade.sellerId);
                
                // Calculate total value
                const totalValue = trade.shares * trade.price;
                
                // Handle market maker trades (only update the human participant)
                if (trade.buyerId === 'marketmaker' && sellerLedger) {
                  // Market maker buying from human - only update seller's ledger
                  sellerLedger.cash += totalValue;
                  if (!sellerLedger.shares) sellerLedger.shares = new Map();
                  const sellerShares = sellerLedger.shares.get(trade.companyId) || 0;
                  const newShares = Math.max(0, sellerShares - trade.shares);
                  sellerLedger.shares.set(trade.companyId, newShares);
                  
                  console.log(`✅ Market maker buy trade processed: ${trade.shares} shares of ${trade.companyId} at $${trade.price} (total: $${totalValue})`);
                  console.log(`🔍 Shares update: ${sellerShares} - ${trade.shares} = ${newShares} shares`);
                  console.log(`🔍 Seller ledger before trade:`, {
                    participantId: trade.sellerId,
                    cash: sellerLedger.cash,
                    shares: Object.fromEntries(sellerLedger.shares || new Map())
                  });
                  console.log(`🔍 All available participants in ledger:`, Array.from(ledgerModule.ledgers.keys()));
                  
                  // Check if there's an IPO module with different ledger data
                  if (sessionIPO && sessionIPO[socket.sessionId]) {
                    console.log(`🔍 IPO module exists for session: ${socket.sessionId}`);
                    // Try to get IPO ledger data
                    try {
                      const ipoLedger = sessionIPO[socket.sessionId].ledgerModule;
                      if (ipoLedger && ipoLedger.ledgers) {
                        console.log(`🔍 IPO ledger participants:`, Array.from(ipoLedger.ledgers.keys()));
                        const ipoParticipant = ipoLedger.ledgers.get(trade.sellerId);
                        if (ipoParticipant) {
                          console.log(`🔍 IPO ledger for ${trade.sellerId}:`, {
                            cash: ipoParticipant.cash,
                            shares: Object.fromEntries(ipoParticipant.shares || new Map())
                          });
                        }
                      }
                    } catch (error) {
                      console.log(`🔍 Error accessing IPO ledger:`, error.message);
                    }
                  }
                } else if (trade.sellerId === 'marketmaker' && buyerLedger) {
                  // Market maker selling to human - only update buyer's ledger
                  buyerLedger.cash -= totalValue;
                  if (!buyerLedger.shares) buyerLedger.shares = new Map();
                  const currentShares = buyerLedger.shares.get(trade.companyId) || 0;
                  buyerLedger.shares.set(trade.companyId, currentShares + trade.shares);
                  
                  console.log(`✅ Market maker sell trade processed: ${trade.shares} shares of ${trade.companyId} at $${trade.price} (total: $${totalValue})`);
                } else if (buyerLedger && sellerLedger) {
                  // Human to human trade - update both ledgers
                  buyerLedger.cash -= totalValue;
                  if (!buyerLedger.shares) buyerLedger.shares = new Map();
                  const currentShares = buyerLedger.shares.get(trade.companyId) || 0;
                  buyerLedger.shares.set(trade.companyId, currentShares + trade.shares);
                  
                  sellerLedger.cash += totalValue;
                  if (!sellerLedger.shares) sellerLedger.shares = new Map();
                  const sellerShares = sellerLedger.shares.get(trade.companyId) || 0;
                  sellerLedger.shares.set(trade.companyId, Math.max(0, sellerShares - trade.shares));
                  
                  console.log(`✅ Human trade processed: ${trade.shares} shares of ${trade.companyId} at $${trade.price} (total: $${totalValue})`);
                } else {
                  console.error('❌ Ledger not found for trade participants', { buyerId: trade.buyerId, sellerId: trade.sellerId });
                }
              } catch (error) {
                console.error('❌ Error processing trade through ledger:', error);
              }
            });
            
            // Store trades in database for persistence
            payload.trades.forEach(trade => {
              db.run(`INSERT INTO trades (id, game_id, company_id, buyer_id, seller_id, shares, price, timestamp) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [trade.id || Date.now().toString(), socket.sessionId, trade.companyId, trade.buyerId, trade.sellerId, trade.shares, trade.price],
                function(err) {
                  if (err) {
                    console.error('❌ Error storing trade in database:', err);
                  } else {
                    console.log(`💾 Trade stored in database: ${trade.shares} shares of ${trade.companyId} at $${trade.price}`);
                  }
                }
              );
            });
            
            // Emit to client
            console.log(`📤 Emitting tradesExecuted to client: ${payload.trades.length} trades`);
            io.to(socket.sessionId).emit('tradesExecuted', payload);
          });
        }
        
        // Set participants and start trading
        sessionTrading[socket.sessionId].setParticipants(game.participants);
        const companies = game.companies.map(c => ({ 
          id: c.id, 
          name: c.name, 
          ipoPrice: c.currentPrice || c.ipoPrice || 1.0 
        }));
        sessionTrading[socket.sessionId].startTrading(companies);
        
        // Emit updated game state
        io.to(socket.sessionId).emit('gameStateUpdate', game);
        socket.emit('tradingStarted', { message: 'Trading phase has begun!' });
        console.log('✅ Trading phase activated successfully');
      } else if (game.phase === 'trading') {
        game.phase = 'newspaper';
        console.log('✅ Advanced from trading to newspaper phase');
        io.to(socket.sessionId).emit('gameStateUpdate', game);
      } else {
        console.log(`⚠️ Cannot advance from phase: ${game.phase}`);
      }
    } else {
      console.error('❌ No game found for session:', socket.sessionId);
      console.error('🔍 Available sessions:', Object.keys(gameStates));
      console.error('🔍 Socket sessionId:', socket.sessionId);
    }
  });

  socket.on('startManualTrading', () => {
    // Handle starting manual trading
    console.log('🚀 User starting manual trading');
    
    // Fix: Ensure sessionId is set if it's undefined
    if (!socket.sessionId) {
      socket.sessionId = 'shared_game';
      console.log('🔧 Fixed undefined sessionId for startManualTrading, set to:', socket.sessionId);
    }
    
    const game = gameStates[socket.sessionId];
    if (game) {
      console.log(`🔍 Current phase: ${game.phase}, changing to trading`);
      game.phase = 'trading';
      
      // Create per-session trading engine
      if (!sessionTrading[socket.sessionId]) {
        console.log('🔧 Creating new trading engine for session');
        sessionTrading[socket.sessionId] = new TradingModule();
        
        // Connect trading module to ledger module
        sessionTrading[socket.sessionId].ledgerModule = ledgerModule;
        
        // Connect ledger module to trading module for real-time prices
        ledgerModule.setTradingModule(sessionTrading[socket.sessionId]);
        
        // Process trades through the ledger system (only set up once per trading module)
        console.log(`🔧 Setting up tradesExecuted event handler for session: ${socket.sessionId}`);
        sessionTrading[socket.sessionId].on('tradesExecuted', (payload) => {
          console.log(`📊 Processing ${payload.trades.length} trades through ledger...`);
          
          // Process each trade through the ledger
          payload.trades.forEach(trade => {
            try {
              const buyerLedger = ledgerModule.ledgers.get(trade.buyerId);
              const sellerLedger = ledgerModule.ledgers.get(trade.sellerId);
              
              if (buyerLedger && sellerLedger) {
                // Calculate total value
                const totalValue = trade.shares * trade.price;
                
                // Update buyer's ledger
                buyerLedger.cash -= totalValue;
                if (!buyerLedger.shares) buyerLedger.shares = new Map();
                const currentShares = buyerLedger.shares.get(trade.companyId) || 0;
                buyerLedger.shares.set(trade.companyId, currentShares + trade.shares);
                
                // Update seller's ledger
                sellerLedger.cash += totalValue;
                if (!sellerLedger.shares) sellerLedger.shares = new Map();
                const sellerShares = sellerLedger.shares.get(trade.companyId) || 0;
                sellerLedger.shares.set(trade.companyId, Math.max(0, sellerShares - trade.shares));
                
                console.log(`✅ Trade processed: ${trade.shares} shares of ${trade.companyId} at $${trade.price} (total: $${totalValue})`);
              } else {
                console.error('❌ Ledger not found for trade participants');
              }
            } catch (error) {
              console.error('❌ Error processing trade through ledger:', error);
            }
          });
          
          // Emit to client
          console.log(`📤 Emitting tradesExecuted to client: ${payload.trades.length} trades`);
          io.to(socket.sessionId).emit('tradesExecuted', payload);
        });
      }
      
      // Set participants for trading module
      sessionTrading[socket.sessionId].setParticipants(game.participants);
      
      // Start trading with current company data
      const companies = game.companies.map(c => ({ 
        id: c.id, 
        name: c.name, 
        ipoPrice: c.currentPrice || c.ipoPrice || 1.0 
      }));
      console.log('🚀 Starting trading with companies:', companies);
      sessionTrading[socket.sessionId].startTrading(companies);
      
      io.to(socket.sessionId).emit('gameStateUpdate', game);
      socket.emit('tradingStarted', { message: 'Trading phase has begun!' });
      console.log('✅ Trading phase activated successfully');
    } else {
      console.error('❌ No game found for session:', socket.sessionId);
    }
  });

  socket.on('proceedToTrading', () => {
    // Handle proceeding to trading phase from any phase
    console.log('🚨 User force advancing to trading phase');
    
    // Fix: Ensure sessionId is set if it's undefined
    if (!socket.sessionId) {
      socket.sessionId = 'shared_game';
      console.log('🔧 Fixed undefined sessionId for proceedToTrading, set to:', socket.sessionId);
    }
    
    const game = gameStates[socket.sessionId];
    if (game) {
      console.log(`🔍 Current phase: ${game.phase}, changing to trading`);
      game.phase = 'trading';
      
      // Create per-session trading engine
      if (!sessionTrading[socket.sessionId]) {
        console.log('🔧 Creating new trading engine for session');
        sessionTrading[socket.sessionId] = new TradingModule();
        
        // Connect trading module to ledger module
        sessionTrading[socket.sessionId].ledgerModule = ledgerModule;
        
        // Connect ledger module to trading module for real-time prices
        ledgerModule.setTradingModule(sessionTrading[socket.sessionId]);
        
        // Process trades through the ledger system (only set up once per trading module)
        console.log(`🔧 Setting up tradesExecuted event handler for session: ${socket.sessionId}`);
        sessionTrading[socket.sessionId].on('tradesExecuted', (payload) => {
          console.log(`📊 Processing ${payload.trades.length} trades through ledger...`);
          
          // Process each trade through the ledger
          payload.trades.forEach(trade => {
            let saleResult = true; // Default to true for market maker
            let purchaseResult = true; // Default to true for market maker
            
            // Only process ledger entries for real participants (not market maker)
            if (trade.sellerId !== 'marketmaker') {
              saleResult = ledgerModule.recordSale(
                trade.sellerId,
                trade.companyId,
                trade.shares,
                trade.price
              );
            } else {
              console.log(`📊 Market maker sold ${trade.shares} shares (no ledger entry needed)`);
            }
            
            if (trade.buyerId !== 'marketmaker') {
              purchaseResult = ledgerModule.recordPurchase(
                trade.buyerId,
                trade.companyId,
                null, // company name will be filled by ledger
                trade.shares,
                trade.price,
                'trading'
              );
            } else {
              console.log(`📊 Market maker bought ${trade.shares} shares (no ledger entry needed)`);
            }
            
            if (saleResult && purchaseResult) {
              console.log(`✅ Trade processed - ${trade.shares} shares at $${trade.price}`);
            } else {
              console.error(`❌ Failed to process trade - Sale: ${!!saleResult}, Purchase: ${!!purchaseResult}`);
            }
          });
          
          // Emit to client
          console.log(`📤 Emitting tradesExecuted to client: ${payload.trades.length} trades`);
          io.to(socket.sessionId).emit('tradesExecuted', payload);
        });
      }
      
      // Set participants for trading module
      sessionTrading[socket.sessionId].setParticipants(game.participants);
      
      // Start trading with current company data
      const companies = game.companies.map(c => ({ 
        id: c.id, 
        ipoPrice: c.currentPrice || c.ipoPrice || 1.0 
      }));
      console.log('🚀 Starting trading with companies:', companies);
      sessionTrading[socket.sessionId].startTrading(companies);
      
      io.to(socket.sessionId).emit('gameStateUpdate', game);
      socket.emit('tradingStarted', { message: 'Trading phase has begun!' });
      console.log('✅ Trading phase activated successfully');
    } else {
      console.error('❌ No game found for session:', socket.sessionId);
    }
  });

  socket.on('placeOrder', (orderData) => {
    // Handle trading orders
    console.log('Trading order placed:', orderData);
    const { participantId, companyId, orderType, shares, price } = orderData || {};
    
    // Debug participant ID
    console.log('🔍 Order Debug - participantId:', participantId);
    console.log('🔍 Order Debug - Available participants:', gameStates[socket.sessionId]?.participants?.map(p => ({ id: p.id, name: p.name, isHuman: p.isHuman })));
    console.log('🔍 Order Debug - Available ledger participants:', Array.from(ledgerModule.ledgers.keys()));
    
    if (!participantId || !companyId || !shares || shares <= 0) {
      console.error('Invalid order data:', orderData);
      return;
    }
    try {
      const engine = sessionTrading[socket.sessionId];
      const game = gameStates[socket.sessionId];
      if (!engine || !game) {
        console.error('Trading engine or game not available');
        return;
      }
      const refPrice = (game.companies.find(c => c.id === companyId)?.currentPrice) || 0;
      const isMarketOrder = price === 0;
      const orderPrice = isMarketOrder ? refPrice : price;
      const orderTypeStr = isMarketOrder ? 'market' : 'limit';
      
      if (orderType === 'buy') {
        engine.submitBuyOrder(participantId, companyId, shares, orderPrice, orderTypeStr);
      } else if (orderType === 'sell') {
        engine.submitSellOrder(participantId, companyId, shares, orderPrice, orderTypeStr);
      }
    } catch (e) { 
      console.error('Trading order error:', e); 
    }
  });

  socket.on('submitTradingOrder', (orderData) => {
    // Handle trading orders from the new interface
    console.log('📤 Trading order submitted:', orderData);
    console.log('🔍 Socket sessionId:', socket.sessionId);
    console.log('🔍 Available trading engines:', Object.keys(sessionTrading));
    console.log('🔍 Available game states:', Object.keys(gameStates));
    
    const { participantId, companyId, orderType, shares, price } = orderData || {};
    
    if (!participantId || !companyId || !orderType || !shares || !price) {
      console.log('❌ Invalid order data:', orderData);
      socket.emit('orderError', { message: 'Invalid order data' });
      return;
    }
    
    // Fix: Ensure sessionId is set if it's undefined
    if (!socket.sessionId) {
      socket.sessionId = 'shared_game';
      console.log('🔧 Fixed undefined sessionId for trading order, set to:', socket.sessionId);
    }
    
    try {
      const engine = sessionTrading[socket.sessionId];
      const game = gameStates[socket.sessionId];
      if (!engine || !game) {
        console.error('Trading engine or game not available for session:', socket.sessionId);
        console.error('Engine available:', !!engine);
        console.error('Game available:', !!game);
        socket.emit('orderError', { message: 'Trading engine not available' });
        return;
      }
      
      const refPrice = (game.companies.find(c => c.id === companyId)?.currentPrice) || 0;
      // Market orders should execute immediately at best available price
      // For now, treat all orders as market orders for immediate execution
      const isMarketOrder = true; // Always execute immediately at best available price
      const orderPrice = refPrice; // Use current market price as reference
      const orderTypeStr = 'market';
      
      if (orderType === 'buy') {
        engine.submitBuyOrder(participantId, companyId, shares, orderPrice, orderTypeStr);
        console.log('✅ Buy order submitted successfully');
        socket.emit('orderSuccess', { message: 'Buy order submitted successfully' });
      } else if (orderType === 'sell') {
        engine.submitSellOrder(participantId, companyId, shares, orderPrice, orderTypeStr);
        console.log('✅ Sell order submitted successfully');
        socket.emit('orderSuccess', { message: 'Sell order submitted successfully' });
      } else {
        console.log('❌ Invalid order type:', orderType);
        socket.emit('orderError', { message: 'Invalid order type' });
      }
    } catch (e) { 
      console.error('Trading order error:', e);
      socket.emit('orderError', { message: 'Order submission failed: ' + e.message });
    }
  });

  socket.on('updateCompany', (updateData) => {
    // Handle company management updates
    console.log('Company updated:', updateData);
  });

  socket.on('resetGame', async () => {
    console.log('🔄 Game reset requested');
    
    // Clear Event Store database completely
    if (eventStoreIntegration && eventStoreIntegration.isEventStoreEnabled()) {
      try {
        await eventStoreIntegration.clearAllData();
        console.log('✅ Event Store database cleared');
      } catch (error) {
        console.error('❌ Failed to clear Event Store:', error);
      }
    }
    
    // Clear legacy ledger
    ledgerModule.ledgers.clear();
    console.log('✅ Legacy ledger cleared');
    
    if (socket.gameState) {
      // Completely recreate the game state
      createGame().then(newGame => {
        gameStates[socket.sessionId] = newGame;
        socket.gameState = newGame;
        
        // Emit updated game state
        io.to(socket.sessionId).emit('gameStateUpdate', newGame);
        console.log('✅ Game completely reset to fresh lobby state');
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.get('/api/game', (req, res) => {
  const sessionId = req.query.session || 'default';
  const freshStart = req.query.fresh === 'true';
  
  // If fresh start requested, always create new game
  if (freshStart || !gameStates[sessionId]) {
    createGame().then(game => {
      gameStates[sessionId] = game;
      console.log(`🔄 Fresh game created for session: ${sessionId}`);
      res.json(game);
    });
  } else {
    res.json(gameStates[sessionId]);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  const packageJson = require('../package.json');
  res.json({
    version: packageJson.version || '1.0.0',
    name: packageJson.name || 'lemonade-stand-game',
    buildDate: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Event Store API endpoints
app.get('/api/event-store/participants', async (req, res) => {
  try {
    console.log('🔍 Event Store API: /api/event-store/participants called');
    console.log('🔍 Event Store enabled:', eventStoreIntegration.isEventStoreEnabled());
    
    if (eventStoreIntegration.isEventStoreEnabled()) {
      console.log('🔍 Using Event Store for participants data');
      const participants = await eventStoreIntegration.getAllParticipantsData();
      res.json({ success: true, data: participants });
    } else {
      console.log('🔍 Using legacy ledger for participants data');
      // Fallback to legacy system
      const participants = ledgerModule.getAllLedgers();
      res.json({ success: true, data: participants });
    }
  } catch (error) {
    console.error('❌ Event Store API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get participants data' });
  }
});

app.get('/api/event-store/participant/:id', async (req, res) => {
  try {
    const participantId = req.params.id;
    if (eventStoreIntegration.isEventStoreEnabled()) {
      const portfolio = await eventStoreIntegration.getParticipantPortfolio(participantId);
      res.json({ success: true, data: portfolio });
    } else {
      // Fallback to legacy system
      const portfolio = ledgerModule.getLedgerSummary(participantId);
      res.json({ success: true, data: portfolio });
    }
  } catch (error) {
    console.error('❌ Event Store API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get participant data' });
  }
});

// Get ledger data from memory (using existing ledger system)
app.get('/api/ledger', (req, res) => {
  const sessionId = req.query.session || 'shared_game';
  
  try {
    // Use the existing ledger module instead of database
    const ledgers = {};
    
    if (ledgerModule && ledgerModule.ledgers) {
      for (const [participantId, ledgerData] of ledgerModule.ledgers) {
        ledgers[participantId] = {
          participantId: participantId,
          participantName: ledgerData.participantName || 'Unknown',
          cash: ledgerData.cash || 0,
          netWorth: ledgerData.totalNetWorth || ledgerData.cash || 0,
          shares: ledgerData.shares || new Map()
        };
      }
    }
    
    console.log('📊 Ledger data fetched from memory:', Object.keys(ledgers).length, 'participants');
    res.json({ ledgers });
  } catch (error) {
    console.error('❌ Error fetching ledger data:', error);
    res.status(500).json({ error: 'Ledger error' });
  }
});


app.post('/api/reset', async (req, res) => {
  // Complete game reset - clear everything
  if (currentGame) {
    console.log('🔄 Performing complete game reset...');
    
    // Clear Event Store database completely
    if (eventStoreIntegration && eventStoreIntegration.isEventStoreEnabled()) {
      try {
        await eventStoreIntegration.clearAllData();
        console.log('✅ Event Store database cleared');
      } catch (error) {
        console.error('❌ Failed to clear Event Store:', error);
      }
    }
    
    // Clear legacy ledger
    ledgerModule.ledgers.clear();
    console.log('✅ Legacy ledger cleared');
    
    // Reset game state
    currentGame.phase = 'lobby';
    currentGame.turn = 0;
    currentGame.startTime = null;
    currentGame.endTime = null;
    currentGame.winnerId = null;
    
    // Clear ALL participants (including humans)
    currentGame.participants = [];
    console.log('✅ All participants cleared');
    
    // Reset companies completely
    currentGame.companies.forEach(company => {
      company.totalSharesAllocated = 0;
      company.ceoId = null;
      company.currentPrice = 10.00 + (Math.random() * 5.00); // New random price
    });
    console.log('✅ Companies reset with new prices');
    
    // Clear all other data
    currentGame.shares = {};
    currentGame.trades = [];
    currentGame.orders = [];
    currentGame.news = [];
    
    // Emit reset to all clients
    io.emit('gameStateUpdate', currentGame);
    io.emit('gameReset', { message: 'Game completely reset - all participants cleared' });
    
    console.log('✅ Complete game reset successful');
    res.json({ status: 'reset', message: 'Game completely reset - all participants cleared' });
  } else {
    res.json({ status: 'error', message: 'No game to reset' });
  }
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// ============================================
// SERVER STARTUP with PORT FALLBACK
// ============================================
const PORT = parseInt(process.env.PORT || '3001', 10);
const FALLBACK_PORT = 5001;
let triedPorts = new Set();

const startServer = (port) => {
  if (triedPorts.has(port)) {
    console.error('❌ All ports exhausted. Cannot start server.');
    process.exit(1);
  }
  
  triedPorts.add(port);
  
  server.listen(port, () => {
    console.log('========================================');
    console.log('🍋 LEMONADE STAND - Backend Server');
    console.log('========================================');
    console.log(`✅ Server running on port ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${path.join(__dirname, 'game.db')}`);
    console.log('========================================');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (port === PORT) {
        console.log(`⚠️  Port ${PORT} is in use, trying ${FALLBACK_PORT}...`);
        startServer(FALLBACK_PORT);
      } else {
        console.error(`❌ Fallback port ${port} is also in use.`);
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to start server:', err.message);
      process.exit(1);
    }
  });
};

startServer(PORT);

// Add error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

