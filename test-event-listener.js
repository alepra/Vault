/**
 * Test to check if the tradesExecuted event listener is working
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Testing Event Listener...\n');

// Create modules
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();

// Initialize a participant
ledgerModule.initializeParticipant('p6bankeii', 'Joe', 1000);
console.log('✅ Participant initialized');

// Initialize a company
tradingModule.initializeCompany('company_1', 2.0);
console.log('✅ Company initialized');

// Manually set up the event listener (like the module bridge should do)
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

console.log('✅ Event listener set up');

// Activate trading
tradingModule.tradingActive = true;
tradingModule.weeklyTrading = true;
console.log('✅ Trading activated');

// Test buy order
console.log('\n🧪 Testing buy order...');
const buyResult = tradingModule.submitBuyOrder('p6bankeii', 'company_1', 10, 2.1, 'limit');
console.log('Buy result:', buyResult);

// Check if trade was executed
setTimeout(() => {
    const shares = ledgerModule.getTotalShares('p6bankeii', 'company_1');
    console.log('\n🔍 Shares owned:', shares);
    
    if (shares > 0) {
        console.log('✅ SUCCESS: Event listener is working!');
    } else {
        console.log('❌ FAILURE: Event listener is not working!');
    }
    
    process.exit(0);
}, 1000);
