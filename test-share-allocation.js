/**
 * Simple test to check share allocation
 */

const IPOModule = require('./server/modules/ipoModule');

// Mock IO object with proper methods
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 Mock IO: Emitting ${event}`);
  },
  to: (sessionId) => ({
    emit: (event, data) => {
      console.log(`📡 Mock IO: Emitting ${event} to session ${sessionId}`);
    }
  })
};

// Create game state
const gameState = {
  id: 'test-game',
  phase: 'lobby',
  companies: [
    { id: 'company1', name: 'Lemonade Stand A', shares: 1000, totalSharesAllocated: 0 },
    { id: 'company2', name: 'Lemonade Stand B', shares: 1000, totalSharesAllocated: 0 },
    { id: 'company3', name: 'Lemonade Stand C', shares: 1000, totalSharesAllocated: 0 },
    { id: 'company4', name: 'Lemonade Stand D', shares: 1000, totalSharesAllocated: 0 }
  ],
  participants: [
    { id: 'human1', name: 'Test Player', isHuman: true, capital: 1000, remainingCapital: 1000, shares: {} }
  ]
};

async function testShareAllocation() {
  console.log('🧪 Testing Share Allocation...\n');

  const ipoModule = new IPOModule(gameState, mockIO, 'test-session');
  
  // Start IPO
  ipoModule.startIPO();
  
  // Add bots
  const botPersonalities = [
    { bidStrategy: 'aggressive', riskTolerance: 0.8, concentration: 0.6 },
    { bidStrategy: 'conservative', riskTolerance: 0.3, concentration: 0.4 },
    { bidStrategy: 'momentum', riskTolerance: 0.7, concentration: 0.5 },
    { bidStrategy: 'value', riskTolerance: 0.5, concentration: 0.7 },
    { bidStrategy: 'growth', riskTolerance: 0.6, concentration: 0.8 },
    { bidStrategy: 'diversified', riskTolerance: 0.4, concentration: 0.3 }
  ];
  
  botPersonalities.forEach((personality, index) => {
    const bot = {
      id: `bot${index + 1}`,
      name: `Bot ${index + 1}`,
      isHuman: false,
      capital: 1000,
      remainingCapital: 1000,
      shares: {},
      personality: personality
    };
    ipoModule.botNames.updateBotName(bot);
    gameState.participants.push(bot);
  });
  
  // Process human bids (smaller amounts to avoid overspending)
  const humanBids = [
    { companyId: 'company1', shares: 100, price: 2.0 },
    { companyId: 'company2', shares: 100, price: 2.0 }
  ];
  
  await ipoModule.processHumanBids(humanBids, 'human1');
  
  // Process AI bids
  await ipoModule.processAIBids();
  
  // Complete IPO
  ipoModule.completeIPO();
  
  // Check results
  console.log('\n📊 Final Share Allocation:');
  gameState.companies.forEach(company => {
    const allocated = company.totalSharesAllocated || 0;
    const remaining = company.shares - allocated;
    console.log(`  ${company.name}: ${allocated}/${company.shares} shares`);
    if (remaining > 0) {
      console.log(`    ❌ ${remaining} shares unsold!`);
    } else {
      console.log(`    ✅ All shares sold!`);
    }
  });
  
  console.log('\n📊 Net Worth Check:');
  const ledgerData = ipoModule.getLedgerData();
  ledgerData.forEach(ledger => {
    const netWorth = ledger.cash + ledger.totalStockValue;
    const isCorrect = Math.abs(netWorth - 1000) < 0.01;
    console.log(`  ${ledger.participantName}: $${netWorth.toFixed(2)} ${isCorrect ? '✅' : '❌'}`);
  });
  
  console.log('\n✅ Test completed!');
}

testShareAllocation().catch(console.error);

