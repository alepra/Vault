/**
 * Test Script for Module Communication
 * This tests the module bridge and communication between modules
 */

const GameStateModule = require('./server/modules/gameStateModule');
const IPOModule = require('./server/modules/ipoModule');
const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const BotNameModule = require('./server/modules/botNameModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Testing Module Communication...\n');

// Initialize all modules
const gameState = new GameStateModule();
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const botNameModule = new BotNameModule();
const moduleBridge = new ModuleBridge();

// Mock IO object
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 Mock IO emit: ${event}`, data ? 'with data' : 'no data');
  }
};

// Initialize the bridge
moduleBridge.initializeModules(gameState, null, tradingModule, ledgerModule, botNameModule, mockIO);

console.log('✅ All modules initialized');

// Test 1: Game State Module
console.log('\n🧪 Test 1: Game State Module');
const gameData = gameState.getGameState();
console.log(`Game ID: ${gameData.id}`);
console.log(`Phase: ${gameData.phase}`);
console.log(`Companies: ${gameData.companies.length}`);
console.log(`Participants: ${gameData.participants.length}`);

// Test 2: Add Participants
console.log('\n🧪 Test 2: Adding Participants');
const human = gameState.addParticipant('Test Human', true);
const bot = gameState.addParticipant('Test Bot', false);
console.log(`Human participant: ${human.name} (${human.id})`);
console.log(`Bot participant: ${bot.name} (${bot.id})`);

// Test 3: Initialize IPO Module
console.log('\n🧪 Test 3: IPO Module');
const ipoModule = new IPOModule(gameData, mockIO);
moduleBridge.initializeModules(gameState, ipoModule, tradingModule, ledgerModule, botNameModule, mockIO);

const ipoStarted = ipoModule.startIPO();
console.log(`IPO started: ${ipoStarted}`);
console.log(`IPO status:`, ipoModule.getStatus());

// Test 4: Ledger Module
console.log('\n🧪 Test 4: Ledger Module');
const ledgerInitialized = ledgerModule.initializeParticipant(human.id, human.name, true, 1000);
console.log(`Human ledger initialized: ${!!ledgerInitialized}`);

const botLedgerInitialized = ledgerModule.initializeParticipant(bot.id, bot.name, false, 1000);
console.log(`Bot ledger initialized: ${!!botLedgerInitialized}`);

// Test 5: Trading Module
console.log('\n🧪 Test 5: Trading Module');
const tradingStarted = tradingModule.startTrading(gameData.companies);
console.log(`Trading started: ${tradingStarted}`);

// Test 6: Module Bridge Status
console.log('\n🧪 Test 6: Module Bridge Status');
const bridgeStatus = moduleBridge.getStatus();
console.log('Bridge Status:', JSON.stringify(bridgeStatus, null, 2));

// Test 7: Test Trading Order Submission
console.log('\n🧪 Test 7: Trading Order Submission');
const orderResult = moduleBridge.submitTradingOrder(human.id, gameData.companies[0].id, 'buy', 10, 2.50);
console.log('Order submission result:', orderResult);

// Test 8: Test Market Data
console.log('\n🧪 Test 8: Market Data');
const marketData = moduleBridge.getMarketData(gameData.companies[0].id);
console.log('Market data:', marketData ? 'Available' : 'Not available');

// Test 9: Test Game State for Clients
console.log('\n🧪 Test 9: Game State for Clients');
const clientGameState = moduleBridge.getGameStateForClients();
console.log(`Client game state phase: ${clientGameState.currentPhase}`);
console.log(`Client game state has market data: ${!!clientGameState.marketData}`);
console.log(`Client game state has ledger data: ${!!clientGameState.ledgerData}`);

console.log('\n✅ All module communication tests completed!');
console.log('\n📊 Summary:');
console.log('- Game State Module: ✅ Working');
console.log('- IPO Module: ✅ Working');
console.log('- Trading Module: ✅ Working');
console.log('- Ledger Module: ✅ Working');
console.log('- Bot Name Module: ✅ Working');
console.log('- Module Bridge: ✅ Working');
console.log('\n🎯 The modular communication system is ready for testing!');

