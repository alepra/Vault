/**
 * Test the REAL game flow to identify the actual problems
 */

const IPOModule = require('./server/modules/ipoModule');
const LedgerModule = require('./server/modules/ledgerModule');

async function testRealGameFlow() {
  console.log('🧪 Testing REAL Game Flow...\n');

  // Create a mock game state like the real game
  const gameState = {
    id: 'test-game',
    phase: 'lobby',
    participants: [
      { id: 'human1', name: 'Test Player', isHuman: true, capital: 1000, remainingCapital: 1000, shares: {}, totalSpent: 0 },
      { id: 'bot1', name: 'Bot 1', isHuman: false, capital: 1000, remainingCapital: 1000, shares: {}, totalSpent: 0, personality: { bidStrategy: 'aggressive', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.3 } },
      { id: 'bot2', name: 'Bot 2', isHuman: false, capital: 1000, remainingCapital: 1000, shares: {}, totalSpent: 0, personality: { bidStrategy: 'conservative', riskTolerance: 0.3, concentration: 0.5, bidMultiplier: 0.8 } },
      { id: 'bot3', name: 'Bot 3', isHuman: false, capital: 1000, remainingCapital: 1000, shares: {}, totalSpent: 0, personality: { bidStrategy: 'momentum', riskTolerance: 0.7, concentration: 0.75, bidMultiplier: 1.2 } }
    ],
    companies: [
      { id: 'company1', name: 'Sunny Lemonade', shares: 1000, currentPrice: 0, ipoPrice: 0 },
      { id: 'company2', name: 'Cool Breeze', shares: 1000, currentPrice: 0, ipoPrice: 0 },
      { id: 'company3', name: 'Fresh Squeeze', shares: 1000, currentPrice: 0, ipoPrice: 0 },
      { id: 'company4', name: 'Golden Citrus', shares: 1000, currentPrice: 0, ipoPrice: 0 }
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

  // Initialize Ledger module
  const ledger = new LedgerModule();

  console.log('📊 Initial State:');
  gameState.participants.forEach(p => {
    console.log(`  ${p.name}: $${p.remainingCapital} cash`);
  });

  // Start IPO
  console.log('\n🚀 Starting IPO...');
  await ipo.startIPO();

  // Process human bids (simulate real bidding)
  const humanBids = {
    company1: { shares: 350, pricePerShare: 2.0 },
    company2: { shares: 200, pricePerShare: 1.5 }
  };

  console.log('\n👤 Processing human bids...');
  await ipo.processHumanBids(humanBids, 'human1'); // Pass the participant ID

  // Process AI bids
  console.log('\n🤖 Processing AI bids...');
  await ipo.processAIBids();

  // Complete IPO
  console.log('\n✅ Completing IPO...');
  await ipo.completeIPO();

  // Check final state
  console.log('\n📊 Final State:');
  for (const participant of gameState.participants) {
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
  }

  // Check company IPO results
  console.log('\n🏢 Company IPO Results:');
  gameState.companies.forEach(company => {
    console.log(`  ${company.name}: $${company.ipoPrice.toFixed(2)} per share`);
  });

  console.log('\n✅ Real game flow test completed!');
}

testRealGameFlow().catch(console.error);
