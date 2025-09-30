/**
 * Test phase change to see if initializeTradingPhase is called
 */

const GameStateModule = require('./server/modules/gameStateModule');
const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Testing Phase Change...\n');

// Create modules
const gameState = new GameStateModule();
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const moduleBridge = new ModuleBridge();

// Initialize the module bridge
moduleBridge.initializeModules(gameState, null, tradingModule, ledgerModule, null, null);

// Create a test game
gameState.createGame('test_game');
gameState.addParticipant('test_user', 'Test User', true);

// Add test companies
const testCompanies = [
    { id: 'company_1', name: 'Test Company 1', ipoPrice: 1.5, shares: 1000 },
    { id: 'company_2', name: 'Test Company 2', ipoPrice: 2.0, shares: 1000 }
];

testCompanies.forEach(company => {
    gameState.addCompany(company.id, company.name, company.shares, company.ipoPrice);
});

console.log('✅ Test game created with companies');

// Check initial phase
console.log('🔍 Initial phase:', gameState.getGameState().phase);

// Change phase to trading
console.log('\n🔄 Changing phase to trading...');
gameState.setPhase('trading', null, moduleBridge);

// Check if trading module is initialized
console.log('\n🔍 After phase change:');
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
