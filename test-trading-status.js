/**
 * Test to check if the trading module is active in the real game
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Checking Trading Module Status in Real Game...\n');

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
console.log('  orderBooks size:', tradingModule.orderBooks.size);
console.log('  marketMakers size:', tradingModule.marketMakers.size);

// Test manual trading activation (like clicking Start Trading button)
console.log('\n🔧 Testing manual trading activation...');
moduleBridge.startManualTrading();

// Check status after manual activation
console.log('\n🔍 After manual activation:');
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);
console.log('  orderBooks size:', tradingModule.orderBooks.size);
console.log('  marketMakers size:', tradingModule.marketMakers.size);

// Test if we can submit a buy order
console.log('\n🧪 Testing buy order submission...');
const buyResult = tradingModule.submitBuyOrder('mm23xzuzx', 'company_1', 10, 1.60, 'limit');
console.log('Buy order result:', buyResult);

// Check if trades were executed
setTimeout(() => {
    const ledger = ledgerModule.ledgers.get('mm23xzuzx');
    const shares = ledgerModule.getTotalShares('mm23xzuzx', 'company_1');
    
    console.log('\n🔍 Checking if trade was executed...');
    console.log('  Shares owned:', shares);
    console.log('  Cash remaining: $' + (ledger ? ledger.cash.toFixed(2) : 'N/A'));
    
    if (shares > 0) {
        console.log('✅ SUCCESS: Trading is working correctly!');
    } else {
        console.log('❌ FAILURE: Trading is not working!');
        console.log('   The issue is that the trading module is not executing trades.');
    }
    
    process.exit(0);
}, 1000);
