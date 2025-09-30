/**
 * Test to see if manual trading activation works
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Testing Manual Trading Activation...\n');

// Create modules exactly like the real game
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const moduleBridge = new ModuleBridge();

// Initialize the module bridge
console.log('🔧 Initializing Module Bridge...');
moduleBridge.initializeModules(null, null, tradingModule, ledgerModule, null, null);

// Check initial status
console.log('🔍 Initial Trading Module Status:');
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);

// Test manual trading activation (like the Start Trading button)
console.log('\n🔧 Testing manual trading activation...');
moduleBridge.startManualTrading();

// Check status after manual activation
console.log('\n🔍 After manual activation:');
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);

// Test if we can submit a buy order
console.log('\n🧪 Testing buy order submission...');
const buyResult = tradingModule.submitBuyOrder('test_user', 'company_1', 10, 1.60, 'limit');
console.log('Buy order result:', buyResult);

console.log('\n🏁 Test Complete');
