/**
 * Test to debug the real game trading module
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Debugging Real Game Trading Module...\n');

// Create modules exactly like the real game
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const moduleBridge = new ModuleBridge();

// Initialize the module bridge
console.log('🔧 Initializing Module Bridge...');
moduleBridge.initializeModules(null, null, tradingModule, ledgerModule, null, null);

// Check if event listener is set up
const listeners = tradingModule.listeners('tradesExecuted');
console.log('🔍 Event listener setup:');
console.log('  tradesExecuted listeners count:', listeners.length);

// Test if we can manually emit a tradesExecuted event
console.log('\n🧪 Testing tradesExecuted event...');

// Create a test participant
ledgerModule.initializeParticipant('mm23xzuzx', 'Pete', 1000);

// Manually emit a tradesExecuted event to test the listener
console.log('📤 Manually emitting tradesExecuted event...');
tradingModule.emit('tradesExecuted', {
    companyId: 'company_1',
    trades: [{
        id: 'test_trade',
        companyId: 'company_1',
        buyerId: 'mm23xzuzx',
        sellerId: 'marketmaker',
        shares: 10,
        price: 1.60,
        timestamp: Date.now()
    }]
});

// Check if the trade was processed
setTimeout(() => {
    const ledger = ledgerModule.ledgers.get('mm23xzuzx');
    const shares = ledgerModule.getTotalShares('mm23xzuzx', 'company_1');
    
    console.log('\n🔍 Checking if trade was processed...');
    console.log('  Shares owned:', shares);
    console.log('  Cash remaining: $' + ledger.cash.toFixed(2));
    
    if (shares > 0) {
        console.log('✅ SUCCESS: Event listener is working correctly!');
        console.log('   The issue is that tradesExecuted events are not being emitted by the trading module.');
    } else {
        console.log('❌ FAILURE: Event listener is not processing trades!');
        console.log('   The issue is in the module bridge event listener.');
    }
    
    process.exit(0);
}, 1000);
