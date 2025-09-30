/**
 * Test human bidding to reproduce the $300 cash issue
 */

const IPOModule = require('./server/modules/ipoModule');
const LedgerModule = require('./server/modules/ledgerModule');

async function testHumanBidding() {
  console.log('🧪 Testing Human Bidding to Find $300 Cash Issue...\n');

  // Create a mock game state
  const gameState = {
    id: 'test-game',
    phase: 'lobby',
    participants: [
      { id: 'human1', name: 'Test Player', isHuman: true, capital: 1000, remainingCapital: 1000, shares: {}, totalSpent: 0 }
    ],
    companies: [
      { id: 'company1', name: 'Sunny Lemonade', shares: 1000, currentPrice: 0, ipoPrice: 0 },
      { id: 'company2', name: 'Cool Breeze', shares: 1000, currentPrice: 0, ipoPrice: 0 }
    ]
  };

  // Create mock io object
  const mockIo = {
    emit: (event, data) => {
      console.log(`📡 Mock emit: ${event}`);
    },
    to: (sessionId) => ({
      emit: (event, data) => {
        console.log(`📡 Mock emit to ${sessionId}: ${event}`);
      }
    })
  };

  // Initialize IPO module
  const ipo = new IPOModule(gameState, mockIo, 'test-game');

  console.log('📊 Initial State:');
  console.log(`  ${gameState.participants[0].name}: $${gameState.participants[0].remainingCapital} cash`);

  // Start IPO
  console.log('\n🚀 Starting IPO...');
  await ipo.startIPO();

  // Process human bids that might cause $300 cash issue
  const humanBids = {
    company1: { shares: 350, pricePerShare: 2.0 },
    company2: { shares: 200, pricePerShare: 1.5 }
  };

  console.log('\n👤 Processing human bids...');
  console.log('Human bids:', humanBids);
  
  // Calculate expected cost
  const totalCost = (350 * 2.0) + (200 * 1.5);
  console.log(`Expected total cost: $${totalCost}`);
  console.log(`Expected remaining cash: $${1000 - totalCost}`);

  // Process the bids
  const result = await ipo.processHumanBids(humanBids, 'human1');
  console.log('Bid processing result:', result);

  // Check final state
  console.log('\n📊 Final State:');
  const participant = gameState.participants[0];
  const ledgerData = ipo.ledger.ledgers.get(participant.id);
  
  if (ledgerData) {
    console.log(`  ${participant.name}:`);
    console.log(`    Cash: $${ledgerData.cash.toFixed(2)}`);
    console.log(`    Stock Value: $${ledgerData.totalStockValue.toFixed(2)}`);
    console.log(`    Net Worth: $${ledgerData.totalNetWorth.toFixed(2)}`);
    console.log(`    Shares:`, ledgerData.shares);
  } else {
    console.log(`  ${participant.name}: NO LEDGER DATA FOUND`);
  }

  console.log('\n✅ Human bidding test completed!');
}

testHumanBidding().catch(console.error);

