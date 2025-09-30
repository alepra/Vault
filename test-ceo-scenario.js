/**
 * CEO Scenario Test
 * Tests CEO status with 35%+ ownership
 */

const LedgerModule = require('./server/modules/ledgerModule');

console.log('🧪 Testing CEO Scenario...\n');

const ledger = new LedgerModule();

// Initialize participant
ledger.initializeParticipant('human1', 'Test Player', true, 1000);
console.log('✅ Participant initialized\n');

// Buy 400 shares (40% ownership) to become CEO
console.log('Test: Buying 400 shares to become CEO...');
const success = ledger.recordPurchase('human1', 'company1', 'Lemonade Stand A', 400, 2.50, 'ipo');

if (success) {
  console.log('✅ Purchase successful');
  
  // Check CEO status
  const ceoData = ledger.getCEO('company1');
  if (ceoData) {
    console.log(`👑 CEO Status: ${ceoData.participantName} (${ceoData.ownership.toFixed(1)}% ownership)`);
  }
  
  // Check ledger
  const ledgerData = ledger.getLedgerSummary('human1');
  console.log(`💰 Net Worth: $${ledgerData.totalNetWorth.toFixed(2)}`);
  console.log(`💵 Cash: $${ledgerData.cash.toFixed(2)}`);
  console.log(`📈 Stock Value: $${ledgerData.totalStockValue.toFixed(2)}`);
  
  // Test selling shares to lose CEO status
  console.log('\nTest: Selling 100 shares to lose CEO status...');
  const saleResult = ledger.recordSale('human1', 'company1', 100, 3.00);
  
  if (saleResult) {
    console.log('✅ Sale successful');
    
    // Check CEO status again
    const ceoDataAfter = ledger.getCEO('company1');
    if (ceoDataAfter) {
      console.log(`👑 Still CEO: ${ceoDataAfter.participantName} (${ceoDataAfter.ownership.toFixed(1)}% ownership)`);
    } else {
      console.log('❌ No longer CEO (below 35% threshold)');
    }
    
    // Check updated ledger
    const updatedLedger = ledger.getLedgerSummary('human1');
    console.log(`💰 Updated Net Worth: $${updatedLedger.totalNetWorth.toFixed(2)}`);
  }
}

console.log('\n✅ CEO scenario test completed!');

