/**
 * Test to check if participant IDs are matching between trading and ledger modules
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Testing Participant ID Matching...\n');

// Create modules
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();

// Test with different participant ID formats
const testIds = [
    'p6bankeii',  // From your error message
    'participant_1',
    'user123',
    'test_user'
];

console.log('🔍 Testing different participant ID formats:');
testIds.forEach(id => {
    console.log(`\n📝 Testing ID: "${id}"`);
    
    // Initialize participant in ledger
    ledgerModule.initializeParticipant(id, 'Test User', 1000);
    
    // Check if participant exists in ledger
    const ledgerExists = ledgerModule.getParticipantLedger(id);
    console.log(`   Ledger exists: ${!!ledgerExists}`);
    
    // Check if participant exists in trading module
    const tradingExists = tradingModule.participants && tradingModule.participants[id];
    console.log(`   Trading exists: ${!!tradingExists}`);
    
    // Test trade execution
    tradingModule.initializeCompany('company_1', 2.0);
    tradingModule.tradingActive = true;
    tradingModule.weeklyTrading = true;
    
    // Set up event listener
    tradingModule.on('tradesExecuted', (tradeData) => {
        console.log(`   📊 Trade executed for ${id}: ${tradeData.trades.length} trades`);
        tradeData.trades.forEach(trade => {
            if (trade.buyerId === id) {
                console.log(`   ✅ Buyer ID matches: ${trade.buyerId}`);
            } else {
                console.log(`   ❌ Buyer ID mismatch: expected ${id}, got ${trade.buyerId}`);
            }
        });
    });
    
    // Submit buy order
    const buyResult = tradingModule.submitBuyOrder(id, 'company_1', 5, 2.1, 'limit');
    console.log(`   Buy order result: ${buyResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    // Check shares after trade
    setTimeout(() => {
        const shares = ledgerModule.getTotalShares(id, 'company_1');
        console.log(`   Shares owned: ${shares}`);
        
        if (shares > 0) {
            console.log(`   ✅ SUCCESS: ${id} owns shares`);
        } else {
            console.log(`   ❌ FAILURE: ${id} owns no shares`);
        }
    }, 100);
});

// Wait for all tests to complete
setTimeout(() => {
    console.log('\n🏁 Participant ID test completed');
    process.exit(0);
}, 2000);
