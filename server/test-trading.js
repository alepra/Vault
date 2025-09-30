const TradingModule = require('./modules/tradingModule');

// Create trading module instance
const trading = new TradingModule();

// Test data - simulate 4 companies after IPO
const testCompanies = [
    { id: 'company1', name: 'Lemonade Stand 1', ipoPrice: 2.50 },
    { id: 'company2', name: 'Lemonade Stand 2', ipoPrice: 3.00 },
    { id: 'company3', name: 'Lemonade Stand 3', ipoPrice: 1.75 },
    { id: 'company4', name: 'Lemonade Stand 4', ipoPrice: 2.25 }
];

console.log('🧪 Testing Trading Module...\n');

// Start trading
trading.startTrading(testCompanies);

// Set up event listeners
trading.on('tradesExecuted', (data) => {
    console.log(`📈 Trades executed for ${data.companyId}:`);
    data.trades.forEach(trade => {
        console.log(`  - ${trade.shares} shares @ $${trade.price.toFixed(2)} (Buyer: ${trade.buyerId}, Seller: ${trade.sellerId})`);
    });
    console.log('');
});

trading.on('tradingStarted', (data) => {
    console.log(`🚀 Trading started for ${data.companies} companies\n`);
});

// Test 1: Basic buy/sell orders
console.log('Test 1: Basic Order Matching');
console.log('============================');

// Submit some buy orders for company1
trading.submitBuyOrder('player1', 'company1', 100, 2.60);
trading.submitBuyOrder('player2', 'company1', 50, 2.55);
trading.submitBuyOrder('bot1', 'company1', 75, 2.45);

// Submit some sell orders for company1
trading.submitSellOrder('player3', 'company1', 80, 2.50);
trading.submitSellOrder('bot2', 'company1', 60, 2.40);
trading.submitSellOrder('player4', 'company1', 90, 2.35);

// Check market data
const marketData1 = trading.getMarketData('company1');
console.log('Market Data for Company 1:');
console.log(`Current Price: $${marketData1.currentPrice.toFixed(2)}`);
console.log(`Market Maker: Bid $${marketData1.marketMaker.bidPrice.toFixed(2)}, Ask $${marketData1.marketMaker.askPrice.toFixed(2)}`);
console.log(`Total Buy Orders: ${marketData1.buyOrders.length} (${marketData1.totalBuyShares} shares)`);
console.log(`Total Sell Orders: ${marketData1.sellOrders.length} (${marketData1.totalSellShares} shares)`);
console.log('');

// Test 2: Market maker liquidity
console.log('Test 2: Market Maker Liquidity');
console.log('==============================');

// Submit orders that might need market maker
trading.submitBuyOrder('player5', 'company2', 200, 2.80);
trading.submitSellOrder('player6', 'company2', 150, 3.20);

const marketData2 = trading.getMarketData('company2');
console.log('Market Data for Company 2:');
console.log(`Current Price: $${marketData2.currentPrice.toFixed(2)}`);
console.log(`Market Maker: Bid $${marketData2.marketMaker.bidPrice.toFixed(2)}, Ask $${marketData2.marketMaker.askPrice.toFixed(2)}`);
console.log('');

// Test 3: Price discovery with multiple companies
console.log('Test 3: Multi-Company Trading');
console.log('=============================');

// Add orders for all companies
testCompanies.forEach((company, index) => {
    const basePrice = company.ipoPrice;
    
    // Add some buy orders
    trading.submitBuyOrder(`buyer${index}1`, company.id, 50, basePrice * 1.1);
    trading.submitBuyOrder(`buyer${index}2`, company.id, 75, basePrice * 1.05);
    
    // Add some sell orders
    trading.submitSellOrder(`seller${index}1`, company.id, 60, basePrice * 0.95);
    trading.submitSellOrder(`seller${index}2`, company.id, 40, basePrice * 0.90);
});

// Show final prices for all companies
console.log('Final Prices After Trading:');
console.log('===========================');
testCompanies.forEach(company => {
    const marketData = trading.getMarketData(company.id);
    const priceChange = ((marketData.currentPrice - company.ipoPrice) / company.ipoPrice * 100).toFixed(1);
    console.log(`${company.name}: $${marketData.currentPrice.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChange}%)`);
});

console.log('\n✅ Trading module test completed!');




