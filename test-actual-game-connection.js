/**
 * Test actual game connection and data flow
 */

const http = require('http');

async function testActualGame() {
  console.log('🧪 Testing Actual Game Connection...\n');

  // Test backend health
  try {
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend health check:', healthData);
  } catch (error) {
    console.log('❌ Backend not responding:', error.message);
    return;
  }

  // Test game state
  try {
    const gameResponse = await fetch('http://localhost:3001/api/game');
    const gameData = await gameResponse.json();
    console.log('✅ Game state retrieved:', {
      phase: gameData.phase,
      participants: gameData.participants?.length || 0,
      companies: gameData.companies?.length || 0
    });
    
    if (gameData.participants) {
      console.log('\n📊 Participants:');
      gameData.participants.forEach(p => {
        console.log(`  ${p.name}: $${p.remainingCapital} cash, $${p.totalSpent} spent`);
      });
    }
  } catch (error) {
    console.log('❌ Game state error:', error.message);
  }

  // Test ledger data
  try {
    const ledgerResponse = await fetch('http://localhost:3001/api/ledger');
    const ledgerData = await ledgerResponse.json();
    console.log('\n✅ Ledger data retrieved:', {
      participants: Object.keys(ledgerData).length
    });
    
    Object.entries(ledgerData).forEach(([id, ledger]) => {
      console.log(`  ${ledger.participantName}: $${ledger.cash} cash, $${ledger.totalStockValue} stock, $${ledger.totalNetWorth} net worth`);
    });
  } catch (error) {
    console.log('❌ Ledger data error:', error.message);
  }

  console.log('\n✅ Actual game connection test completed!');
}

testActualGame().catch(console.error);

