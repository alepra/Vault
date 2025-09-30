// Standalone Trading Module Test
// Test trading mechanics in isolation without IPO complications

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Starting Standalone Trading Test...');

// Create test companies with IPO prices
const testCompanies = [
    { id: 1, name: 'Lemonade Co', ipoPrice: 2.50, currentPrice: 2.50, shares: 1000 },
    { id: 2, name: 'Juice Corp', ipoPrice: 3.00, currentPrice: 3.00, shares: 1000 },
    { id: 3, name: 'Smoothie Inc', ipoPrice: 1.75, currentPrice: 1.75, shares: 1000 },
    { id: 4, name: 'Drink Co', ipoPrice: 4.25, currentPrice: 4.25, shares: 1000 }
];

// Create test participants
const testParticipants = [
    { id: 'human1', name: 'Test Human', isHuman: true },
    { id: 'bot1', name: 'Test Bot 1', isHuman: false },
    { id: 'bot2', name: 'Test Bot 2', isHuman: false }
];

// Initialize modules
const ledgerModule = new LedgerModule();
const tradingModule = new TradingModule();

// Initialize participants in ledger
testParticipants.forEach(participant => {
    ledgerModule.initializeParticipant(participant.id, participant.name, participant.isHuman, 1000);
    console.log(`✅ Initialized ${participant.name}: $1000 cash`);
});

// Connect trading module to ledger
tradingModule.ledgerModule = ledgerModule;
tradingModule.setParticipants(testParticipants);

// CRITICAL FIX: Add event listener to process trades through ledger
tradingModule.on('tradesExecuted', (tradeData) => {
    console.log(`📊 Processing ${tradeData.trades.length} trades through ledger...`);
    
    // Process each trade through the ledger
    tradeData.trades.forEach(trade => {
        let saleResult = true; // Default to true for market maker
        let purchaseResult = true; // Default to true for market maker
        
        // Only process ledger entries for real participants (not market maker)
        if (trade.sellerId !== 'marketmaker') {
            saleResult = ledgerModule.recordSale(
                trade.sellerId,
                trade.companyId,
                trade.shares,
                trade.price
            );
        } else {
            console.log(`📊 Market maker sold ${trade.shares} shares (no ledger entry needed)`);
        }
        
        if (trade.buyerId !== 'marketmaker') {
            purchaseResult = ledgerModule.recordPurchase(
                trade.buyerId,
                trade.companyId,
                null, // company name will be filled by ledger
                trade.shares,
                trade.price,
                'trading'
            );
        } else {
            console.log(`📊 Market maker bought ${trade.shares} shares (no ledger entry needed)`);
        }
        
        if (saleResult && purchaseResult) {
            console.log(`✅ Trade processed - ${trade.shares} shares at $${trade.price}`);
        } else {
            console.error(`❌ Failed to process trade - Sale: ${!!saleResult}, Purchase: ${!!purchaseResult}`);
        }
    });
});

console.log('\n🎯 Starting Trading Phase...');
tradingModule.startTrading(testCompanies);

// Test human buy order
setTimeout(() => {
    console.log('\n📈 Testing Human Buy Order...');
    const buyOrder = {
        participantId: 'human1',
        companyId: 1,
        shares: 100,
        price: 2.60,
        isBuy: true
    };
    
    console.log('Submitting buy order:', buyOrder);
    const result = tradingModule.submitBuyOrder(buyOrder.participantId, buyOrder.companyId, buyOrder.shares, buyOrder.price);
    console.log('Buy order result:', result);
    
    // Check ledger
    const humanLedger = ledgerModule.getLedgerSummary('human1');
    if (humanLedger) {
        console.log('Human ledger after buy:', {
            cash: humanLedger.cash || 0,
            totalStockValue: humanLedger.totalStockValue || 0,
            totalNetWorth: humanLedger.totalNetWorth || 0,
            stockPositions: humanLedger.stockPositions || []
        });
    } else {
        console.log('❌ Human ledger not found!');
    }
    
}, 2000);

// Test human sell order
setTimeout(() => {
    console.log('\n📉 Testing Human Sell Order...');
    const sellOrder = {
        participantId: 'human1',
        companyId: 1,
        shares: 50,
        price: 2.70,
        isBuy: false
    };
    
    console.log('Submitting sell order:', sellOrder);
    const result = tradingModule.submitSellOrder(sellOrder.participantId, sellOrder.companyId, sellOrder.shares, sellOrder.price);
    console.log('Sell order result:', result);
    
    // Check ledger
    const humanLedger = ledgerModule.getLedgerSummary('human1');
    if (humanLedger) {
        console.log('Human ledger after sell:', {
            cash: humanLedger.cash || 0,
            totalStockValue: humanLedger.totalStockValue || 0,
            totalNetWorth: humanLedger.totalNetWorth || 0,
            stockPositions: humanLedger.stockPositions || []
        });
    } else {
        console.log('❌ Human ledger not found!');
    }
    
}, 4000);

// Stop trading after 10 seconds
setTimeout(() => {
    console.log('\n🛑 Stopping Trading Test...');
    tradingModule.stopTrading();
    
    // Final ledger check
    console.log('\n📊 Final Ledger Summary:');
    ledgerModule.ledgers.forEach((ledger, participantId) => {
        const summary = ledgerModule.getLedgerSummary(participantId);
        if (summary) {
            console.log(`${summary.participantName}: $${summary.cash.toFixed(2)} cash, $${summary.totalStockValue.toFixed(2)} stocks, $${summary.totalNetWorth.toFixed(2)} total`);
        }
    });
    
    process.exit(0);
}, 10000);
