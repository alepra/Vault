/**
 * Ledger System Test
 * Tests the new ledger system in isolation
 */

const LedgerModule = require('./server/modules/ledgerModule');
const BotNameModule = require('./server/modules/botNameModule');

console.log('🧪 Testing Ledger System...\n');

// Test 1: Initialize participants
console.log('Test 1: Initializing participants...');
const ledger = new LedgerModule();
const botNames = new BotNameModule();

// Initialize human participant
ledger.initializeParticipant('human1', 'Test Player', true, 1000);
console.log('✅ Human participant initialized');

// Initialize bot participants
ledger.initializeParticipant('bot1', 'Conservative Bot', false, 1000);
ledger.initializeParticipant('bot2', 'Aggressive Bot', false, 1000);
console.log('✅ Bot participants initialized\n');

// Test 2: Record IPO purchases
console.log('Test 2: Recording IPO purchases...');

// Human buys 50 shares at $2.50
const success1 = ledger.recordPurchase('human1', 'company1', 'Lemonade Stand A', 50, 2.50, 'ipo');
console.log(`Human purchase: ${success1 ? 'SUCCESS' : 'FAILED'}`);

// Bot buys 100 shares at $2.00
const success2 = ledger.recordPurchase('bot1', 'company1', 'Lemonade Stand A', 100, 2.00, 'ipo');
console.log(`Bot purchase: ${success2 ? 'SUCCESS' : 'FAILED'}\n`);

// Test 3: Check ledger summaries
console.log('Test 3: Checking ledger summaries...');
const humanLedger = ledger.getLedgerSummary('human1');
const botLedger = ledger.getLedgerSummary('bot1');

console.log('Human Ledger:');
console.log(`  Cash: $${humanLedger.cash.toFixed(2)}`);
console.log(`  Stock Value: $${humanLedger.totalStockValue.toFixed(2)}`);
console.log(`  Net Worth: $${humanLedger.totalNetWorth.toFixed(2)}`);
console.log(`  P&L: $${humanLedger.totalProfitLoss.toFixed(2)}`);

console.log('\nBot Ledger:');
console.log(`  Cash: $${botLedger.cash.toFixed(2)}`);
console.log(`  Stock Value: $${botLedger.totalStockValue.toFixed(2)}`);
console.log(`  Net Worth: $${botLedger.totalNetWorth.toFixed(2)}`);
console.log(`  P&L: $${botLedger.totalProfitLoss.toFixed(2)}\n`);

// Test 4: Check CEO status
console.log('Test 4: Checking CEO status...');
const ceoData = ledger.getCEO('company1');
if (ceoData) {
  console.log(`CEO: ${ceoData.participantName} (${ceoData.ownership.toFixed(1)}% ownership)`);
} else {
  console.log('No CEO (need 35%+ ownership)');
}

// Test 5: Test FIFO selling
console.log('\nTest 5: Testing FIFO selling...');
const saleResult = ledger.recordSale('human1', 'company1', 25, 3.00);
if (saleResult) {
  console.log(`Sale successful:`);
  console.log(`  Proceeds: $${saleResult.totalProceeds.toFixed(2)}`);
  console.log(`  Cost Basis: $${saleResult.totalCostBasis.toFixed(2)}`);
  console.log(`  Profit: $${saleResult.totalProfit.toFixed(2)}`);
  
  // Check updated ledger
  const updatedLedger = ledger.getLedgerSummary('human1');
  console.log(`  Updated Cash: $${updatedLedger.cash.toFixed(2)}`);
  console.log(`  Updated Net Worth: $${updatedLedger.totalNetWorth.toFixed(2)}`);
}

console.log('\n✅ Ledger system test completed!');

