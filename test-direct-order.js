/**
 * Test direct order submission to see what's happening
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Testing Direct Order Submission...\n');

// Create modules
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();

// Initialize a participant
ledgerModule.initializeParticipant('test_user', 'Test User', 1000);
console.log('✅ Participant initialized');

// Initialize a company
tradingModule.initializeCompany('company_1', 1.5);
console.log('✅ Company initialized');

// Check if order book exists
const orderBook = tradingModule.orderBooks.get('company_1');
console.log('📊 Order book exists:', !!orderBook);
if (orderBook) {
    console.log('  Buy orders:', orderBook.buyOrders.length);
    console.log('  Sell orders:', orderBook.sellOrders.length);
}

// Manually activate trading
tradingModule.tradingActive = true;
tradingModule.weeklyTrading = true;
console.log('✅ Trading activated');

// Test buy order
console.log('\n🧪 Testing buy order...');
const buyResult = tradingModule.submitBuyOrder('test_user', 'company_1', 10, 1.6, 'limit');
console.log('Buy result:', buyResult);

// Check if trade was executed
setTimeout(() => {
    const shares = ledgerModule.getTotalShares('test_user', 'company_1');
    console.log('\n🔍 Shares owned:', shares);
    
    if (shares > 0) {
        console.log('✅ SUCCESS: Trading is working!');
    } else {
        console.log('❌ FAILURE: Trading is not working!');
    }
    
    process.exit(0);
}, 1000);
