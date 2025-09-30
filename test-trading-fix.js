/**
 * Test script to manually activate trading and test order execution
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🔧 Testing Trading Module Fix...\n');

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

// MANUALLY ACTIVATE TRADING (this is the fix!)
console.log('\n🔧 MANUALLY ACTIVATING TRADING...');
tradingModule.tradingActive = true;
tradingModule.weeklyTrading = true;
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);

// Create a test participant
const participantId = 'test_user';
ledgerModule.initializeParticipant(participantId, 'Test User', 1000);

console.log('\n👤 Test Participant Created:');
console.log('  ID:', participantId);
console.log('  Cash: $' + ledgerModule.ledgers.get(participantId).cash);

// Check market maker orders
const orderBook = tradingModule.orderBooks.get(companyId);
console.log('\n📈 Market Maker Sell Orders:');
orderBook.sellOrders.forEach((order, index) => {
    console.log(`  ${index + 1}. ${order.shares} shares at $${order.price.toFixed(2)} (${order.participantId})`);
});

// Submit a buy order that should match
console.log('\n💰 Submitting buy order: 10 shares at $2.60 (should match market maker at $2.52)');
const buyResult = tradingModule.submitBuyOrder(participantId, companyId, 10, 2.60, 'limit');
console.log('  Result:', buyResult);

// Check if trades were executed
console.log('\n🔍 Checking if trades were executed...');
const ledger = ledgerModule.ledgers.get(participantId);
const shares = ledgerModule.getTotalShares(participantId, companyId);
console.log('  Shares owned:', shares);
console.log('  Cash remaining: $' + ledger.cash.toFixed(2));

if (shares > 0) {
    console.log('\n✅ SUCCESS: Trading is now working! Shares were purchased correctly!');
    console.log('   The fix is to ensure tradingActive and weeklyTrading are set to true.');
} else {
    console.log('\n❌ Still not working - need to investigate further.');
}

console.log('\n🏁 Test Complete');
