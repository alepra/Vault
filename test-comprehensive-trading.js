const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 COMPREHENSIVE TRADING TEST');
console.log('=============================\n');

// Create modules
const trading = new TradingModule();
const ledger = new LedgerModule();

// Test data - simulate post-IPO state
const testCompanies = [
    { id: 'company_1', name: 'Sunny Side Lemonade', ipoPrice: 1.50, shares: 1000 },
    { id: 'company_2', name: 'Citrus Dreams Co.', ipoPrice: 1.50, shares: 1000 },
    { id: 'company_3', name: 'Golden Squeeze Inc.', ipoPrice: 2.00, shares: 1000 },
    { id: 'company_4', name: 'Fresh Squeeze Ltd.', ipoPrice: 1.50, shares: 1000 }
];

// Simulate participants with different personalities and holdings
const testParticipants = [
    {
        id: 'human_player',
        name: 'Joe',
        isHuman: true,
        cash: 400,
        shares: { 'company_1': 400 }, // CEO of company_1
        personality: null
    },
    {
        id: 'momentum_trader',
        name: 'Momentum Trader',
        isHuman: false,
        cash: 616,
        shares: { 'company_2': 256 },
        personality: { risk: 0.8, concentration: 0.3, bidStrategy: 'momentum' }
    },
    {
        id: 'scavenger_bot',
        name: 'Scavenger Bot',
        isHuman: false,
        cash: 1000,
        shares: {},
        personality: { risk: 0.5, concentration: 0.8, bidStrategy: 'scavenger' }
    },
    {
        id: 'conservative_bot',
        name: 'Conservative',
        isHuman: false,
        cash: 1000,
        shares: {},
        personality: { risk: 0.2, concentration: 0.9, bidStrategy: 'conservative' }
    }
];

// Initialize ledger with test participants
console.log('📊 Initializing Ledger...');
testParticipants.forEach(participant => {
    ledger.initializeParticipant(participant.id, participant.name, participant.cash);
    // Set their current holdings
    Object.entries(participant.shares).forEach(([companyId, shares]) => {
        const company = testCompanies.find(c => c.id === companyId);
        ledger.recordPurchase(participant.id, companyId, company.name, shares, company.ipoPrice, 'ipo');
    });
    console.log(`  ✅ ${participant.name}: $${participant.cash} cash, ${Object.keys(participant.shares).length} companies`);
});

// Start trading
console.log('\n🚀 Starting Trading Phase...');
trading.startTrading(testCompanies);

// Set up event listeners
trading.on('tradesExecuted', (data) => {
    console.log(`\n📈 TRADES EXECUTED for ${data.companyId}:`);
    data.trades.forEach(trade => {
        console.log(`  💰 ${trade.shares} shares @ $${trade.price.toFixed(2)} (${trade.buyerId} ← ${trade.sellerId})`);
        
        // Update ledger for both parties
        const buyer = testParticipants.find(p => p.id === trade.buyerId);
        const seller = testParticipants.find(p => p.id === trade.sellerId);
        
        if (buyer) {
            buyer.cash -= (trade.shares * trade.price);
            buyer.shares[data.companyId] = (buyer.shares[data.companyId] || 0) + trade.shares;
        }
        if (seller) {
            seller.cash += (trade.shares * trade.price);
            seller.shares[data.companyId] = (seller.shares[data.companyId] || 0) - trade.shares;
            if (seller.shares[data.companyId] <= 0) delete seller.shares[data.companyId];
        }
    });
});

// Simulate trading rounds
async function simulateTradingRound(roundNumber) {
    console.log(`\n🔄 TRADING ROUND ${roundNumber}`);
    console.log('='.repeat(30));
    
    // Human player orders (simulate what you would do)
    console.log('\n👤 HUMAN PLAYER ORDERS:');
    trading.submitBuyOrder('human_player', 'company_2', 20, 1.60); // Buy 20 shares of company_2 at $1.60
    console.log('  📈 Joe: BUY 20 shares of Citrus Dreams Co. at $1.60');
    
    // AI Bot orders based on personalities
    console.log('\n🤖 AI BOT ORDERS:');
    
    testParticipants.forEach(participant => {
        if (participant.isHuman) return;
        
        const personality = participant.personality;
        const availableCash = participant.cash;
        
        // Momentum Trader - aggressive, high risk
        if (personality.bidStrategy === 'momentum') {
            if (availableCash > 100) {
                const shares = Math.floor(Math.random() * 50) + 10;
                const price = 1.50 + (Math.random() * 0.3); // $1.50-$1.80
                trading.submitBuyOrder(participant.id, 'company_3', shares, price);
                console.log(`  📈 ${participant.name}: BUY ${shares} shares of Golden Squeeze at $${price.toFixed(2)}`);
            }
        }
        
        // Scavenger Bot - always trading, looking for deals
        if (personality.bidStrategy === 'scavenger') {
            const company = testCompanies[Math.floor(Math.random() * testCompanies.length)];
            const shares = Math.floor(Math.random() * 100) + 20;
            const price = company.ipoPrice * (0.9 + Math.random() * 0.2); // 90%-110% of IPO price
            trading.submitBuyOrder(participant.id, company.id, shares, price);
            console.log(`  📈 ${participant.name}: BUY ${shares} shares of ${company.name} at $${price.toFixed(2)}`);
        }
        
        // Conservative Bot - low risk, careful
        if (personality.bidStrategy === 'conservative') {
            if (availableCash > 200) {
                const company = testCompanies.find(c => c.ipoPrice <= 1.60); // Only "safe" companies
                if (company) {
                    const shares = Math.floor(Math.random() * 30) + 10;
                    const price = company.ipoPrice * 1.05; // Only 5% above IPO
                    trading.submitBuyOrder(participant.id, company.id, shares, price);
                    console.log(`  📈 ${participant.name}: BUY ${shares} shares of ${company.name} at $${price.toFixed(2)}`);
                }
            }
        }
    });
    
    // Wait a bit for orders to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show current market state
    console.log('\n📊 MARKET STATE:');
    testCompanies.forEach(company => {
        const marketData = trading.getMarketData(company.id);
        const priceChange = ((marketData.currentPrice - company.ipoPrice) / company.ipoPrice * 100).toFixed(1);
        console.log(`  ${company.name}: $${marketData.currentPrice.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChange}%)`);
    });
    
    // Show participant portfolios
    console.log('\n👥 PARTICIPANT PORTFOLIOS:');
    testParticipants.forEach(participant => {
        const totalStockValue = Object.entries(participant.shares).reduce((total, [companyId, shares]) => {
            const company = testCompanies.find(c => c.id === companyId);
            const marketData = trading.getMarketData(companyId);
            return total + (shares * marketData.currentPrice);
        }, 0);
        const netWorth = participant.cash + totalStockValue;
        
        console.log(`  ${participant.name}: $${participant.cash.toFixed(0)} cash, $${totalStockValue.toFixed(0)} stock, $${netWorth.toFixed(0)} total`);
    });
}

// Run multiple trading rounds
async function runTradingSimulation() {
    for (let round = 1; round <= 3; round++) {
        await simulateTradingRound(round);
        console.log('\n⏰ Waiting 2 seconds before next round...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✅ TRADING SIMULATION COMPLETED!');
    console.log('\n📈 FINAL RESULTS:');
    console.log('================');
    
    testCompanies.forEach(company => {
        const marketData = trading.getMarketData(company.id);
        const priceChange = ((marketData.currentPrice - company.ipoPrice) / company.ipoPrice * 100).toFixed(1);
        console.log(`${company.name}: $${marketData.currentPrice.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChange}%)`);
    });
}

// Start the simulation
runTradingSimulation().catch(console.error);
