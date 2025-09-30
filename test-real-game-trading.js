/**
 * Test to check if trading is working in the real game
 */

const TradingModule = require('./server/modules/tradingModule');
const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Testing Real Game Trading...\n');

// Create modules
const tradingModule = new TradingModule();
const ledgerModule = new LedgerModule();

// Initialize a participant (using the real participant ID from the game)
ledgerModule.initializeParticipant('p6bankeii', 'Joe', 1000);
console.log('✅ Participant initialized');

// Initialize companies with real IPO prices
const companies = [
    { id: 'company_1', ipoPrice: 2.0 },
    { id: 'company_2', ipoPrice: 1.5 },
    { id: 'company_3', ipoPrice: 1.5 },
    { id: 'company_4', ipoPrice: 1.5 }
];

companies.forEach(company => {
    tradingModule.initializeCompany(company.id, company.ipoPrice);
    console.log(`✅ Company ${company.id} initialized at $${company.ipoPrice}`);
});

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
        console.log('✅ SUCCESS: Trading is working!');
    } else {
        console.log('❌ FAILURE: Trading is not working!');
    }
    
    process.exit(0);
}, 1000);