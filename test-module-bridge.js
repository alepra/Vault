/**
 * Test module bridge to see if initializeTradingPhase is called
 */

const GameStateModule = require('./server/modules/gameStateModule');
const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Testing Module Bridge...\n');

// Create modules
const gameState = new GameStateModule();
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const moduleBridge = new ModuleBridge();

// Initialize the module bridge
moduleBridge.initializeModules(gameState, null, tradingModule, ledgerModule, null, null);

console.log('✅ Module bridge initialized');

// Check initial state
console.log('🔍 Initial state:');
console.log('  Phase:', gameState.getGameState().phase);
console.log('  Trading active:', tradingModule.tradingActive);
console.log('  Order books:', tradingModule.orderBooks.size);

// Manually call setPhase to trigger initializeTradingPhase
console.log('\n🔄 Manually calling setPhase("trading")...');
moduleBridge.setPhase('trading');

// Check if trading was initialized
console.log('\n🔍 After setPhase:');
console.log('  Phase:', gameState.getGameState().phase);
console.log('  Trading active:', tradingModule.tradingActive);
console.log('  Weekly trading:', tradingModule.weeklyTrading);
console.log('  Order books:', tradingModule.orderBooks.size);
console.log('  Market makers:', tradingModule.marketMakers.size);

if (tradingModule.orderBooks.size > 0) {
    console.log('✅ SUCCESS: Trading phase initialized correctly!');
} else {
    console.log('❌ FAILURE: Trading phase not initialized!');
}

process.exit(0);
