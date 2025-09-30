/**
 * BULLETPROOF LEDGER TEST
 * Test the exact scenario: 350 shares at $1 = $350 stock, $650 cash, $1000 net worth
 */

const LedgerModule = require('./server/modules/ledgerModule');

function testBulletproofLedger() {
  console.log('🧪 Testing Bulletproof Ledger System...\n');

  const ledger = new LedgerModule();
  
  // Initialize participant with $1000
  console.log('Test 1: Initialize participant with $1000');
  ledger.initializeParticipant('test1', 'Test Player', true, 1000);
  
  // Record purchase: 350 shares at $1 = $350
  console.log('\nTest 2: Record purchase - 350 shares at $1.00');
  const success = ledger.recordPurchase('test1', 'company1', 'Lemonade Stand A', 350, 1.00, 'ipo');
  
  if (success) {
    console.log('✅ Purchase recorded successfully');
  } else {
    console.log('❌ Purchase failed');
    return;
  }
  
  // Check final results
  console.log('\nTest 3: Check final results');
  const summary = ledger.getLedgerSummary('test1');
  
  console.log('📊 Final Results:');
  console.log(`  Cash: $${summary.cash.toFixed(2)}`);
  console.log(`  Stock Value: $${summary.totalStockValue.toFixed(2)}`);
  console.log(`  Net Worth: $${summary.totalNetWorth.toFixed(2)}`);
  
  // Verify expected results
  const expectedCash = 650;
  const expectedStockValue = 350;
  const expectedNetWorth = 1000;
  
  console.log('\n📊 Verification:');
  console.log(`  Expected Cash: $${expectedCash}`);
  console.log(`  Actual Cash: $${summary.cash.toFixed(2)} ${Math.abs(summary.cash - expectedCash) < 0.01 ? '✅' : '❌'}`);
  console.log(`  Expected Stock Value: $${expectedStockValue}`);
  console.log(`  Actual Stock Value: $${summary.totalStockValue.toFixed(2)} ${Math.abs(summary.totalStockValue - expectedStockValue) < 0.01 ? '✅' : '❌'}`);
  console.log(`  Expected Net Worth: $${expectedNetWorth}`);
  console.log(`  Actual Net Worth: $${summary.totalNetWorth.toFixed(2)} ${Math.abs(summary.totalNetWorth - expectedNetWorth) < 0.01 ? '✅' : '❌'}`);
  
  // Test negative cash prevention
  console.log('\nTest 4: Test negative cash prevention');
  const badPurchase = ledger.recordPurchase('test1', 'company2', 'Lemonade Stand B', 1000, 1.00, 'ipo');
  if (!badPurchase) {
    console.log('✅ Negative cash purchase correctly blocked');
  } else {
    console.log('❌ Negative cash purchase was allowed!');
  }
  
  // Final verification
  const finalSummary = ledger.getLedgerSummary('test1');
  console.log('\n📊 Final Verification:');
  console.log(`  Cash: $${finalSummary.cash.toFixed(2)} ${finalSummary.cash >= 0 ? '✅' : '❌'}`);
  console.log(`  Net Worth: $${finalSummary.totalNetWorth.toFixed(2)} ${Math.abs(finalSummary.totalNetWorth - 1000) < 0.01 ? '✅' : '❌'}`);
  
  console.log('\n✅ Bulletproof ledger test completed!');
}

testBulletproofLedger();

