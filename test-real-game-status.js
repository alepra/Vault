/**
 * Test to check the trading module status in the real game
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');
const ModuleBridge = require('./server/modules/moduleBridge');

console.log('🧪 Checking Real Game Trading Module Status...\n');

// Create modules exactly like the real game
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();
const moduleBridge = new ModuleBridge();

// Initialize the module bridge
console.log('🔧 Initializing Module Bridge...');
moduleBridge.initializeModules(null, null, tradingModule, ledgerModule, null, null);

// Check trading module status
console.log('🔍 Trading Module Status:');
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);
console.log('  orderBooks size:', tradingModule.orderBooks.size);
console.log('  marketMakers size:', tradingModule.marketMakers.size);

// Check if event listener is set up
const listeners = tradingModule.listeners('tradesExecuted');
console.log('  tradesExecuted listeners count:', listeners.length);

// Test if we can manually activate trading
console.log('\n🔧 Manually activating trading...');
tradingModule.tradingActive = true;
tradingModule.weeklyTrading = true;

console.log('🔍 After manual activation:');
console.log('  tradingActive:', tradingModule.tradingActive);
console.log('  weeklyTrading:', tradingModule.weeklyTrading);

// Test if we can initialize a company
console.log('\n📊 Testing company initialization...');
tradingModule.initializeCompany('test_company', 2.50);

console.log('🔍 After company initialization:');
console.log('  orderBooks size:', tradingModule.orderBooks.size);
console.log('  marketMakers size:', tradingModule.marketMakers.size);

if (tradingModule.orderBooks.has('test_company')) {
    const orderBook = tradingModule.orderBooks.get('test_company');
    console.log('  test_company order book:');
    console.log('    buyOrders:', orderBook.buyOrders.length);
    console.log('    sellOrders:', orderBook.sellOrders.length);
    
    if (orderBook.sellOrders.length > 0) {
        console.log('    market maker sell orders:');
        orderBook.sellOrders.forEach((order, index) => {
            console.log(`      ${index + 1}. ${order.shares} shares at $${order.price.toFixed(2)} (${order.participantId})`);
        });
    }
}

console.log('\n🏁 Status Check Complete');
