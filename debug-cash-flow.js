const LedgerModule = require('./server/modules/ledgerModule');

console.log('🔍 Debugging cash flow in Ledger Module...\n');

const ledger = new LedgerModule();

// Initialize a test participant
const participantId = 'test_human';
ledger.initializeParticipant(participantId, 'Test Human', true, 1000);

console.log('📊 Initial state:');
let testLedger = ledger.ledgers.get(participantId);
console.log(`Cash: $${testLedger.cash}`);
console.log(`Net Worth: $${testLedger.totalNetWorth}`);

// Test a purchase
console.log('\n💰 Testing purchase of 100 shares at $2.00:');
const success = ledger.recordPurchase(participantId, 'company_1', 'Test Company', 100, 2.00, 'ipo');

console.log(`Purchase success: ${success}`);
testLedger = ledger.ledgers.get(participantId);
console.log(`Cash after purchase: $${testLedger.cash}`);
console.log(`Net Worth after purchase: $${testLedger.totalNetWorth}`);

// Test another purchase
console.log('\n💰 Testing purchase of 50 shares at $1.50:');
const success2 = ledger.recordPurchase(participantId, 'company_2', 'Test Company 2', 50, 1.50, 'ipo');

console.log(`Purchase success: ${success2}`);
testLedger = ledger.ledgers.get(participantId);
console.log(`Cash after second purchase: $${testLedger.cash}`);
console.log(`Net Worth after second purchase: $${testLedger.totalNetWorth}`);

// Show stock positions
console.log('\n📈 Stock Positions:');
for (const [companyId, positions] of testLedger.stockPositions) {
  for (const lot of positions) {
    console.log(`  ${companyId}: ${lot.shares} shares at $${lot.pricePerShare} = $${(lot.shares * lot.pricePerShare).toFixed(2)}`);
  }
}

// Test trying to buy more than available cash
console.log('\n🚫 Testing purchase that would exceed cash:');
const success3 = ledger.recordPurchase(participantId, 'company_3', 'Test Company 3', 1000, 1.00, 'ipo');

console.log(`Purchase success: ${success3}`);
testLedger = ledger.ledgers.get(participantId);
console.log(`Cash after failed purchase: $${testLedger.cash}`);
console.log(`Net Worth after failed purchase: $${testLedger.totalNetWorth}`);

console.log('\n✅ Cash flow test complete');

