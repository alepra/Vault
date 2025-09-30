/**
 * Debug script to test trading module order matching
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Testing Trading Module Order Matching...\n');

// Create modules
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();

// Set up trading module with ledger
tradingModule.ledgerModule = ledgerModule;

// Initialize a test company
const companyId = 'test_company';
const ipoPrice = 2.50;

console.log('📊 Initializing company with IPO price $' + ipoPrice);
tradingModule.initializeCompany(companyId, ipoPrice);

// Check if market maker orders were created
const orderBook = tradingModule.orderBooks.get(companyId);
console.log('\n📋 Order Book Status:');
console.log('  Buy Orders:', orderBook.buyOrders.length);
console.log('  Sell Orders:', orderBook.sellOrders.length);

if (orderBook.sellOrders.length > 0) {
    console.log('\n📈 Market Maker Sell Orders:');
    orderBook.sellOrders.forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.shares} shares at $${order.price.toFixed(2)} (${order.participantId})`);
    });
}

// Create a test participant
const participantId = 'test_user';
ledgerModule.initializeParticipant(participantId, 'Test User', 1000);

console.log('\n👤 Test Participant Created:');
console.log('  ID:', participantId);
console.log('  Cash: $' + ledgerModule.ledgers.get(participantId).cash);

// Submit a buy order
console.log('\n💰 Submitting buy order: 10 shares at $2.60');
const buyResult = tradingModule.submitBuyOrder(participantId, companyId, 10, 2.60, 'limit');
console.log('  Result:', buyResult);

// Check order book after buy order
console.log('\n📋 Order Book After Buy Order:');
console.log('  Buy Orders:', orderBook.buyOrders.length);
console.log('  Sell Orders:', orderBook.sellOrders.length);

if (orderBook.buyOrders.length > 0) {
    console.log('\n📈 Buy Orders:');
    orderBook.buyOrders.forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.shares} shares at $${order.price.toFixed(2)} (${order.participantId})`);
    });
}

// Check if trades were executed
console.log('\n🔍 Checking if trades were executed...');
const ledger = ledgerModule.ledgers.get(participantId);
const shares = ledgerModule.getTotalShares(participantId, companyId);
console.log('  Shares owned:', shares);
console.log('  Cash remaining: $' + ledger.cash.toFixed(2));

if (shares === 0) {
    console.log('\n❌ PROBLEM CONFIRMED: Buy order was accepted but no shares were purchased!');
    console.log('   This means the order matching is not working properly.');
} else {
    console.log('\n✅ SUCCESS: Shares were purchased correctly!');
}

console.log('\n🏁 Test Complete');
