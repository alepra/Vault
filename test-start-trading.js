/**
 * Test to see what happens when startTrading is called with real game data
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Testing startTrading with real game data...\n');

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

// Simulate real game companies data (from the API response)
const realGameCompanies = [
    { id: 'company_1', name: 'Sunny Side Lemonade', ipoPrice: 1.5, currentPrice: 1.5, shares: 1000 },
    { id: 'company_2', name: 'Citrus Dreams Co.', ipoPrice: 1.25, currentPrice: 1.25, shares: 1000 },
    { id: 'company_3', name: 'Golden Squeeze Inc.', ipoPrice: 1.5, currentPrice: 1.5, shares: 1000 },
    { id: 'company_4', name: 'Fresh Squeeze Ltd.', ipoPrice: 1.5, currentPrice: 1.5, shares: 1000 }
];

console.log('\n📊 Simulating startTrading with real game companies...');
console.log('Companies:', realGameCompanies.map(c => `${c.name} (${c.id}) - IPO: $${c.ipoPrice}`));

// Call startTrading with real game data
tradingModule.startTrading(realGameCompanies);

// Check status after startTrading
console.log('\n🔍 After startTrading:');
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);
console.log('  orderBooks size:', tradingModule.orderBooks.size);
console.log('  marketMakers size:', tradingModule.marketMakers.size);

// Check each company
realGameCompanies.forEach(company => {
    if (tradingModule.orderBooks.has(company.id)) {
        const orderBook = tradingModule.orderBooks.get(company.id);
        console.log(`  ${company.name}: ${orderBook.buyOrders.length} buy orders, ${orderBook.sellOrders.length} sell orders`);
    } else {
        console.log(`  ${company.name}: NOT INITIALIZED`);
    }
});

// Test if we can submit a buy order
console.log('\n🧪 Testing buy order submission...');
const buyResult = tradingModule.submitBuyOrder('test_user', 'company_1', 10, 1.60, 'limit');
console.log('Buy order result:', buyResult);

console.log('\n🏁 Test Complete');
